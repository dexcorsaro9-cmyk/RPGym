import Foundation
import Capacitor
import HealthKit
import CoreMotion

/// Tracciamento workout in tempo reale via CMPedometer + HKWorkoutSession.
/// Espone a JS: startWorkout, stopWorkout, requestPermissions, getStatus.
/// Emette evento "liveUpdate" ogni ~2 secondi durante la sessione.
@objc(WorkoutPlugin)
public class WorkoutPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "WorkoutPlugin"
    public let jsName = "WorkoutPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWorkout",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopWorkout",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus",          returnType: CAPPluginReturnPromise),
    ]

    // ── Stato ────────────────────────────────────────────────────────────────
    private let healthStore = HKHealthStore()
    private let pedometer   = CMPedometer()
    // Tipizzati Any? per compatibilità con il guard #available(iOS 17.0, *)
    private var workoutSession: Any?
    private var workoutBuilder: Any?
    private var startDate: Date?
    private var lastSteps: Int    = 0
    private var lastDistKm: Double = 0

    // ── Permessi richiesti ───────────────────────────────────────────────────
    private var typesToShare: Set<HKSampleType> {
        [HKObjectType.workoutType()]
    }
    private var typesToRead: Set<HKObjectType> {
        var s: Set<HKObjectType> = [HKObjectType.workoutType()]
        let ids: [HKQuantityTypeIdentifier] = [
            .stepCount, .distanceWalkingRunning, .distanceCycling,
            .heartRate, .activeEnergyBurned
        ]
        for id in ids { if let t = HKObjectType.quantityType(forIdentifier: id) { s.insert(t) } }
        return s
    }

    // ── requestPermissions ───────────────────────────────────────────────────
    @objc public override func requestPermissions(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit non disponibile su questo dispositivo"); return
        }
        guard CMPedometer.isStepCountingAvailable() else {
            call.reject("Contapassi non disponibile su questo dispositivo"); return
        }
        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { granted, error in
            if let err = error { call.reject(err.localizedDescription); return }
            call.resolve(["granted": granted])
        }
    }

    // ── startWorkout ─────────────────────────────────────────────────────────
    @objc public func startWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("Tracciamento workout in tempo reale richiede iOS 17 o superiore")
            return
        }
        guard workoutSession == nil else { call.resolve(["alreadyRunning": true]); return }

        let raw = call.getString("activityType") ?? "running"
        let actType: HKWorkoutActivityType = raw == "walking" ? .walking
                                           : raw == "cycling" ? .cycling
                                           : .running
        let locType: HKWorkoutSessionLocationType = raw == "cycling" ? .indoor : .outdoor

        let config = HKWorkoutConfiguration()
        config.activityType = actType
        config.locationType = locType

        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: config
            )
            workoutSession = session
            workoutBuilder = builder
            startDate = Date()
            lastSteps = 0; lastDistKm = 0

            session.startActivity(with: startDate!)
            builder.beginCollection(withStart: startDate!) { [weak self] _, error in
                guard let self else { return }
                if let err = error { call.reject(err.localizedDescription); return }
                self.startPedometerStream()
                call.resolve([
                    "started":   true,
                    "startTime": self.startDate!.timeIntervalSince1970
                ])
            }
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    // ── CMPedometer stream ───────────────────────────────────────────────────
    private func startPedometerStream() {
        guard let start = startDate else { return }
        pedometer.startUpdates(from: start) { [weak self] data, error in
            guard let self, let data, error == nil else { return }

            let steps   = data.numberOfSteps.intValue
            let distKm  = (data.distance?.doubleValue ?? 0) / 1000.0
            let cadence = data.currentCadence?.doubleValue ?? 0
            let paceRaw = data.currentPace?.doubleValue ?? 0       // sec/m
            let paceMin = paceRaw > 0 ? paceRaw * 1000.0 / 60.0 : 0  // min/km
            let elapsed = Date().timeIntervalSince(start)

            self.lastSteps  = steps
            self.lastDistKm = distKm

            DispatchQueue.main.async {
                self.notifyListeners("liveUpdate", data: [
                    "steps":       steps,
                    "distanceKm":  distKm,
                    "cadence":     cadence,
                    "paceMinPerKm": paceMin,
                    "elapsedSeconds": elapsed
                ])
            }
        }
    }

    // ── stopWorkout ──────────────────────────────────────────────────────────
    @objc public func stopWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("Tracciamento workout in tempo reale richiede iOS 17 o superiore")
            return
        }
        guard let session = workoutSession as? HKWorkoutSession,
              let builder = workoutBuilder as? HKLiveWorkoutBuilder,
              let start   = startDate else {
            call.reject("Nessun workout attivo"); return
        }

        pedometer.stopUpdates()
        let end = Date()
        session.end()

        builder.endCollection(withEnd: end) { [weak self] _, error in
            guard let self else { return }
            if let err = error { call.reject(err.localizedDescription); return }

            // Query pedometro per statistiche finali accurate
            self.pedometer.queryPedometerData(from: start, to: end) { data, _ in
                let steps  = data?.numberOfSteps.intValue ?? self.lastSteps
                let distKm = (data?.distance?.doubleValue ?? self.lastDistKm * 1000) / 1000.0
                let elapsed = end.timeIntervalSince(start)

                builder.finishWorkout { workout, _ in
                    DispatchQueue.main.async {
                        self.workoutSession = nil
                        self.workoutBuilder = nil
                        self.startDate      = nil
                        call.resolve([
                            "steps":          steps,
                            "distanceKm":     distKm,
                            "elapsedSeconds": elapsed,
                            "savedToHealth":  workout != nil
                        ])
                    }
                }
            }
        }
    }

    // ── getStatus ────────────────────────────────────────────────────────────
    @objc public func getStatus(_ call: CAPPluginCall) {
        let active = workoutSession != nil
        var res: [String: Any] = ["active": active]
        if let start = startDate {
            res["elapsedSeconds"] = Date().timeIntervalSince(start)
            res["distanceKm"]     = lastDistKm
            res["steps"]          = lastSteps
        }
        call.resolve(res)
    }
}
