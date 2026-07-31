/* ═══════════════════════════════════════════════════════════════
   Hero's Pace — Interfaccia utente (v2.0)
   ═══════════════════════════════════════════════════════════════ */

let STATE = RPG.load();
let HERO = null;
let CURRENT_TAB = 'camp';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (tag === 'img') e.loading = 'lazy';
  return e;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Avatar dei protagonisti (creati con l'IA) ── */
const AVATARS = [
  { path: 'assets/avatars/eroe1.png',      storyId: 'eroe1',      label: 'Il Viandante' },
  { path: 'assets/avatars/eroe2.png',      storyId: 'eroe2',      label: 'La Viandante' },
  { path: 'assets/avatars/fabbro.png',     storyId: 'fabbro',     label: 'Il Fabbro' },
  { path: 'assets/avatars/stregone.png',   storyId: 'stregone',   label: 'Lo Stregone' },
  { path: 'assets/avatars/alchimista.png', storyId: 'alchimista', label: 'L\'Alchimista' },
  { path: 'assets/avatars/furfante.png',   storyId: 'furfante',   label: 'Il Furfante' },
  { path: 'assets/avatars/maga.png',       storyId: 'maga',       label: 'La Maga' },
  { path: 'assets/avatars/paladino.png',          storyId: 'paladino',         label: 'Il Paladino' },
  { path: 'assets/avatars/ranger.png',            storyId: 'ranger',           label: 'Il Ranger' },
  { path: 'assets/avatars/fata.png',              storyId: 'fata',             label: 'La Fata Elfica' },
  { path: 'assets/avatars/principe.png',          storyId: 'principe',         label: 'Il Principe delle Aquile' },
  { path: 'assets/avatars/principessa.png',       storyId: 'principessa',      label: 'La Principessa Farfallosa' },
  { path: 'assets/avatars/regina.png',            storyId: 'regina',           label: 'La Regina Oscura' },
  { path: 'assets/avatars/predone.png',           storyId: 'predone',          label: 'Il Re dei Predoni' },
  { path: 'assets/avatars/principessa-ghiacci.png', storyId: 'principessa_ghiacci', label: 'La Principessa dei Ghiacci' },
  { path: 'assets/avatars/sacerdotessa-sole.png',   storyId: 'sacerdotessa_sole',   label: 'La Sacerdotessa del Sole' },
  { path: 'assets/avatars/principessa-draghi.png',  storyId: 'principessa_draghi',  label: 'La Principessa dei Draghi' },
];

/* ── Le storie dei protagonisti ── */
const STORIES = {
  eroe1: {
    title: 'Il Figlio del Falegname',
    text: `Sei nato a Oakhaven, tra il profumo di segatura della bottega di tuo padre,
il falegname più abile del borgo. Da lui hai imparato a leggere le venature del
legno come altri leggono i libri, e a intagliare piccoli animali che regalavi ai
bambini del mercato. Il bastone che stringi in viaggio è l'ultima cosa che avete
costruito insieme: sulla cima, un uccellino intagliato — il richiamo che usavate
per ritrovarvi nel bosco quando raccoglievate il legno.
La notte dell'attacco eri fuori le mura, a controllare le trappole per le lepri.
Hai visto il cielo diventare rosso e un'ombra alata coprire la luna. Quando sei
tornato, di casa tua restava solo il camino in piedi, e del villaggio un silenzio
che ancora ti sveglia di notte. Tra la cenere hai trovato il mantello rattoppato
di tuo padre e nessuna traccia della tua famiglia: nessun corpo, nessun addio.
È per questo che cammini, pedali e corri: ogni chilometro è una domanda, e da
qualche parte, oltre i biomi che ti separano dalla Vetta Oscura, c'è la risposta.
Il Cavaliere del Drago ti ha tolto tutto — ma ti ha lasciato le gambe per raggiungerlo.`,
  },
  eroe2: {
    title: 'La Figlia dell\'Erborista',
    text: `Sei cresciuta nell'ultima casa di Oakhaven, quella con il tetto coperto di
fiori, dove tua madre — l'erborista del borgo — curava chiunque bussasse, uomo o
bestia che fosse. Conosci il nome segreto di ogni pianta della Foresta Sussurrante
e sai distinguere un fungo amico da uno che "si offende", come diceva sempre lei.
Nella tua bisaccia di cuoio porti i suoi semi più rari: li pianti dove ti fermi,
perché il mondo rifiorisca dietro i tuoi passi.
La notte dell'attacco eri sulla collina a raccogliere erba lunare, che si coglie
solo col buio. Il boato ti gettò a terra; quando alzasti lo sguardo, un drago
antico oscurava le stelle e Oakhaven bruciava come una torcia. Di tua madre hai
ritrovato solo il mortaio di pietra, ancora caldo, e un biglietto infilato nella
tua sacca chissà quando: "Se tutto brucia, cammina. Le radici profonde non temono il fuoco."
Così fai. Ogni chilometro è un seme piantato, ogni missione un fiore strappato
all'Orda. E quando arriverai alla Vetta Oscura, il Cavaliere del Drago scoprirà
che niente è più pericoloso di chi sa far rinascere le cose.`,
  },
  fabbro: {
    title: 'Il Fabbro delle Fucine Perdute',
    text: `Per duecento anni la tua famiglia ha battuto il ferro nelle Fucine di Ruggine,
e il tuo martello — intagliato in un cuore di vulcano — è passato di padre in
figlio per sette generazioni. Dicevano che tu fossi il migliore: capace di
forgiare una lama così affilata da tagliare il fumo, e così paziente da
riparare la corona del re con gli occhi bendati, per scommessa.
Poi l'Orda è arrivata anche lì. Non hanno spento le fucine: le hanno CORROTTE.
I tuoi golem da lavoro, costruiti per aiutare, si sono rivoltati con gli occhi
pieni di una luce sbagliata. Hai combattuto con il martello ancora rovente,
ma un nano solo non ferma un esercito: sei uscito dalle gallerie con la barba
bruciacchiata, l'incudine da campo sulle spalle e una rabbia che pesa più di entrambe.
Ora percorri le strade del reame, e ogni chilometro è un colpo di martello sul
ferro del destino. Perché un giorno tornerai alle tue Fucine, e quel giorno il
Cavaliere del Drago imparerà la prima regola della bottega: chi rompe, paga.`,
  },
  stregone: {
    title: 'Lo Stregone del Grimorio Scontroso',
    text: `Eri l'apprendista più giovane — e più permaloso — della Torre dell'Alchimista.
Gli altri studenti memorizzavano incantesimi; tu discutevi con loro. Perfino il
tuo grimorio ha un caratteraccio: si chiama Grymoyre, si apre solo quando ne ha
voglia e sbuffa scintille viola quando sbagli la pronuncia di una formula.
Il tuo maestro diceva che il cappello troppo grande ti sarebbe andato bene
"quando la testa avesse raggiunto l'ambizione". Non ha fatto in tempo a vederlo:
la notte in cui il cielo si è riempito d'ali, la Torre è stata assediata e il
maestro ti ha spinto nel passaggio segreto con il grimorio in braccio e un
ultimo incarico sussurrato: "Trova la Valle dei Cristalli Oscuri. E non fidarti del Cavaliere."
Da allora cammini, pedali e corri — perché la magia, come i muscoli, cresce solo
con la fatica. Il cristallo sul tuo bastone si carica a ogni chilometro, e
Grymoyre ha smesso di sbuffare: ora, quando ti guarda allenarti, applaude con le pagine.
Il Cavaliere del Drago ha rubato il cielo. Tu hai intenzione di riprendertelo… con gli interessi.`,
  },
  alchimista: {
    title: 'L\'Alchimista dalla Maschera di Corvo',
    text: `Nessuno ha mai visto il tuo volto, e va bene così: la maschera dal lungo becco
era di tua nonna, la guaritrice che fermò da sola la Febbre Grigia quando i
medici del re scapparono a gambe levate. Dentro il becco lei custodiva erbe
balsamiche; tu ci tieni anche una caramella alla menta, per le emergenze.
Sei cresciuto tra alambicchi e vapori smeraldini, imparando la regola d'oro di
famiglia: ogni veleno nasconde la propria cura, basta avere il coraggio di cercarla.
Sul tuo guanto viaggia Becco, un corvo che ruba cucchiaini d'argento e trova
ingredienti rari fiutandoli a un miglio di distanza.
Quando l'Orda ha devastato Oakhaven, hai esaminato la cenere e il tuo sangue si
è gelato: la fiamma del Drago non brucia soltanto — CORROMPE, e la corruzione
si diffonde come una malattia. È la sfida che tua nonna avrebbe accettato senza esitare.
Così cammini di bioma in bioma, fiala dopo fiala, chilometro dopo chilometro,
distillando l'impossibile: l'antidoto al fuoco del Drago. Il Cavaliere ha portato
la peste nel mondo. Tu sarai la cura.`,
  },
  furfante: {
    title: 'Il Furfante dal Cuore d\'Oro',
    text: `Sei cresciuto nei vicoli di Oakhaven senza famiglia e senza regole, ma con un
codice tutto tuo: rubare solo ai ricchi antipatici, mai più di metà, e lasciare
sempre un fiore al posto del maltolto — per lo stile, ovviamente.
Le guardie ti chiamavano "la Piuma", perché quando arrivavano trovavano solo
quella, infilata nella serratura svuotata. Il fornaio, che ti allungava una
pagnotta nei giorni peggiori, ti chiamava semplicemente "quel bravo monello".
La notte dell'attacco eri sui tetti, il posto migliore per contare le stelle e
le borse dei mercanti. Hai visto il Drago prima di tutti, e hai fatto la cosa
più folle della tua carriera: invece di scappare, hai svegliato il quartiere
casa per casa, bussando ai vetri come un temporale. Quel "bravo monello" quella
notte ha rubato all'Orda il bottino più grosso: settanta persone vive.
Ora ti alleni tra i biomi con il sacco in spalla e il sorriso sotto la maschera,
perché hai messo gli occhi sul colpo del secolo: intrufolarti nella Vetta Oscura
e rubare al Cavaliere del Drago l'unica cosa che conta — la sua vittoria.`,
  },
  maga: {
    title: 'La Maga delle Rune Sussurrate',
    text: `Sei l'ultima allieva della Torre dell'Alchimista a essere entrata nella Foresta
Sussurrante — non per studiare le piante, ma per ascoltarle. Da bambina scoprivi
rune incise nella corteccia degli alberi più antichi, simboli che nessun libro
della Torre elencava, e il tuo bastone (intagliato da tua nonna erborista, la
stessa che curava mezzo Oakhaven) porta ancora i segni delle prime rune che hai
imparato a incidere: uno per ogni pozione riuscita, uno per ogni incantesimo
capito a metà e corretto sul campo. Nella tua bisaccia tintinnano fiale di
colori diversi — verde per guarire, viola per confondere — miscelate con la
stessa pazienza di chi sa che la magia, come le piante, non si affretta.
La notte dell'attacco stavi decifrando una runa nuova alla luce di una candela,
troppo assorta per accorgerti subito del boato. Quando sei corsa fuori, Oakhaven
bruciava e il cristallo in cima al tuo bastone, per la prima volta, si è acceso
da solo — una luce fredda e azzurra che nessun manuale ti aveva insegnato a
evocare. Da allora non si è più spento: pulsa più forte a ogni chilometro,
come se il tuo stesso movimento lo alimentasse. Le rune antiche parlano di un
"Cavaliere" molto prima che tu nascessi: la tua ricerca da studiosa è diventata
una caccia, e ogni passo verso la Vetta Oscura è anche un passo verso la verità
che le rune sussurrate hanno sempre custodito.`,
  },
  paladino: {
    title: 'Il Paladino dell\'Ultima Guardia',
    text: `Eri il più giovane scudiero mai ammesso nella guarnigione di Oakhaven, e lo
stemma del grifone dorato sul tuo petto — quello della tua famiglia, protettori
del borgo da tre generazioni — pesava più della tua armatura intera. Tuo padre,
capitano delle mura, ti ripeteva sempre la stessa regola prima di ogni turno di
guardia: "Lo scudo protegge gli altri. La spada protegge lo scudo. Tu proteggi entrambi."
La notte dell'attacco eri di sentinella al portale nord. Hai visto il Cavaliere
del Drago oscurare la luna un istante prima che il fuoco cadesse dal cielo, e
hai suonato l'allarme prima ancora che le guardie più esperte si voltassero.
Hai tenuto quel portale da solo abbastanza a lungo da far fuggire dodici
famiglie — finché una trave in fiamme non ti ha sepolto sotto le macerie insieme
al tuo scudo, l'unica cosa che sei riuscito a salvare oltre alla tua vita.
Da allora ti alleni senza sosta: ogni chilometro rinforza le braccia che un
giorno reggeranno di nuovo quello scudo davanti alla Vetta Oscura. Non hai
potuto salvare Oakhaven quella notte. La prossima volta, giuri, sarai in tempo.`,
  },
  ranger: {
    title: 'Il Ranger dei Sentieri Perduti',
    text: `Nessuno conosce la Foresta Sussurrante come te: da bambino ti perdevi apposta
tra gli alberi solo per il gusto di ritrovare la strada da solo, e a dodici anni
già leggevi le tracce di un cervo meglio dei cacciatori adulti del borgo. La
bussola che porti al collo era di tuo nonno, esploratore delle terre di confine;
la faretra è cucita con le tue mani, rune-portafortuna incise su ogni freccia.
Vivevi ai margini di Oakhaven, più a tuo agio sotto le fronde che dentro le mura,
quando il cielo si è squarciato di fuoco. Sei corso verso il villaggio contro
ogni istinto di sopravvivenza che la foresta ti aveva insegnato, ma sei arrivato
quando ormai restavano solo braci e un silenzio che nessun animale del bosco
avrebbe mai osato rompere. Hai seguito le tracce dell'Orda per giorni, oltre
i confini che conoscevi, imparando che anche i mostri lasciano un sentiero.
Ora quel sentiero è la tua unica missione: ogni chilometro percorso è una traccia
letta, un indizio in più su dove si nasconde il Cavaliere del Drago. Il migliore
cacciatore del reame non perde mai la sua preda — nemmeno quando la preda è un mostro.`,
  },
  fata: {
    title: 'La Fata delle Radure Segrete',
    text: `Sei nata — se "nascere" è la parola giusta — in una radura della Foresta
Sussurrante che nessuna mappa umana ha mai segnato, dove i funghi crescono in
cerchi perfetti e le lucciole raccontano storie a chi sa ascoltare. Le tue ali,
sottili come vetro colorato, si accendono quando sei felice e sbiadiscono
quando sei triste — un problema, per una fata che non ha mai imparato a nascondere
i sentimenti. Il bastone di legno di sambuco che porti sempre con te è stato un
regalo della Regina del Sottobosco, il giorno in cui hai deciso di lasciare la
radura per curiosare tra gli umani di Oakhaven — gente strana, ma capace di gesti
di una gentilezza che il tuo popolo non conosceva.
La notte dell'attacco stavi giocando a nascondino con i bambini del villaggio,
proprio come facevi ogni sera. Quando il fuoco è caduto dal cielo, hai usato
l'ultima polvere di folletto che avevi per creare uno scudo di luce attorno a
loro — e sei svenuta per lo sforzo, la prima e unica volta in vita tua.
Ti sei risvegliata tra le ceneri, sola: i bambini erano salvi, ma il villaggio
no. Ora voli — o meglio, corri, pedali, cammini, perché la magia da sola non
basta più — in cerca del Cavaliere che ha osato portare l'oscurità nel tuo bosco.
Le fate non dimenticano. E questa fata, in particolare, non perdona.`,
  },
  principe: {
    title: 'Il Principe del Nido degli Aquilotti',
    text: `Sei l'ultimo erede del Regno delle Vette, un trono minuscolo arroccato tra le
montagne oltre Oakhaven, alleato da sempre con i grifoni imperiali che nidificano
sulle guglie di pietra. Da quando eri in fasce un'aquila ti veglia dall'alto —
prima Corvenna, la tua balia alata, poi i suoi figli — e lo scudo con l'aquila
a due teste che porti sempre con te è stato forgiato il giorno della tua nascita,
un giuramento di protezione reciproca tra il tuo popolo e il cielo.
Eri in visita a Oakhaven per un trattato di pace quando l'Orda ha oscurato il
sole. Le tue guardie ti hanno issato in sella a un'aquila per metterti in salvo,
ma hai ordinato di virare INDIETRO, verso le fiamme, per portare in salvo chi
non aveva ali. Hai volato basso tra i tetti che crollavano finché le ali della
tua aquila non hanno preso fuoco — sei precipitato con lei, sopravvivendo entrambi
per miracolo, ma il cielo di quel giorno non l'hai più dimenticato.
Ora ti alleni ogni giorno, in sella o a piedi, per essere di nuovo abbastanza
veloce e forte da meritare il cielo: perché il Cavaliere del Drago vola, e un
principe che si rispetti non lascia che un usurpatore tenga il volo tutto per sé.`,
  },
  principessa: {
    title: 'La Principessa del Giardino Sussurrante',
    text: `Nel cuore della Foresta Sussurrante, ben oltre i sentieri che i cacciatori
osano percorrere, si nasconde un giardino che nessuna mappa segna: il tuo regno,
governato non con la spada ma con un patto antico stretto tra la tua famiglia e
le migliaia di farfalle che popolano quei fiori. La tua armatura è tessuta con le
loro ali cadute, donate per amore e non per caccia, e la lancia che porti è stata
intagliata da un ramo di melo caduto durante la prima fioritura del tuo regno.
Le farfalle sono le tue spie: volano ovunque, vedono ogni cosa, e la notte in
cui Oakhaven bruciò furono loro a portarti la notizia, migliaia di ali che
oscurarono per un istante persino il fumo. Sei corsa in aiuto insieme al tuo
sciame, ma il fuoco dell'Orda non conosce pietà per le ali sottili: ne hai perse
troppe quella notte, disperse per proteggere famiglie che nemmeno conoscevano
il tuo nome.
Ogni chilometro che percorri onora quelle ali perdute, e ogni tesoro che trovi
lungo il cammino — un dono che le farfalle superstiti continuano a scovare per
te, ovunque tu vada — è un passo più vicino al giorno in cui il tuo giardino e
il Cavaliere del Drago si troveranno faccia a faccia.`,
  },
  regina: {
    title: 'La Regina del Crepuscolo Perduto',
    text: `Governavi di notte un piccolo regno ai margini della Valle dei Cristalli
Oscuri, dove il sole non arriva mai del tutto e le farfalle notturne brillano
come stelle cadute. Il tuo scettro di cristallo viola è stato intagliato dalla
tua stessa magia, e Nyx, la civetta che non lascia mai la tua spalla, vede nel
buio più lontano di quanto chiunque altro veda alla luce del giorno.
Molti ti temevano prima ancora di conoscerti — "la Regina Oscura" — ma erano i
piccoli villaggi ai confini del tuo regno, incluso un tratto di Oakhaven, a
dormire più sereni sapendo che la tua magia teneva lontani gli incubi peggiori.
Quando l'Orda calò dal cielo, fosti tu a riconoscere per prima cosa fosse
davvero: non un semplice drago, ma un frammento di oscurità corrotta, la stessa
sostanza che governavi e domavi da una vita intera — sfuggita al controllo di
chi l'aveva risvegliata. Hai combattuto un'intera notte per contenerla, e hai
perso: la corruzione si è diffusa comunque, e Oakhaven è caduta.
Da allora ti alleni senza sosta, perché conosci un segreto che nessun altro
eroe possiede: sai ESATTAMENTE cosa serve per fermare un mostro fatto della tua
stessa magia. Il Cavaliere del Drago ha rubato qualcosa che ti appartiene.
Vuoi indietro l'oscurità — e vuoi indietro Oakhaven.`,
  },
  sacerdotessa_sole: {
    title: 'La Sacerdotessa del Sole Nascente',
    text: `Nell'Ordine della Fiamma Eterna non si nasce — si viene chiamati. Lo scettro
solare che stringi fu forgiato dai tuoi predecessori con l'oro del primo
tramonto, e si accende di luce calda soltanto nelle mani di chi è davvero
degno. I tuoi fratelli sacerdoti dicevano che tu fossi la più dotata dell'ultimo
secolo: capace di trasformare il calore in guarigione, la luce in scudo e il
sorriso in un'arma più efficace di qualsiasi spada.
Vivevi nel Tempio del Meridiano, dove i malati arrivavano da ogni bioma e
ripartivano guariti. Ogni mattina consacravi il giorno al Sole con una preghiera
e ogni sera contavi le vite salvate come fossero monete d'oro — ma più preziose.
La notte dell'attacco non dormivi: stavi vegliando un bambino febbricitante
quando il cielo ha smesso di essere cielo e il Drago Antico ha oscurato le stelle.
Il Tempio ha retto per un'ora — la tua luce contro l'oscurità corrotta — poi le
fondamenta di pietra secolare hanno ceduto, e con loro la maggior parte dell'Ordine.
Sei uscita con lo scettro ancora acceso tra le macerie, il bambino in braccio
(salvo) e una certezza ferma come il sole a mezzogiorno: la luce non può essere
spenta, può solo essere spostata. Ora sei il Tempio. E cammini verso la Vetta
Oscura per riaccendere ciò che l'Orda ha spento.`,
  },
  principessa_draghi: {
    title: 'La Principessa del Sangue dei Draghi',
    text: `Non tutti i draghi sono nemici. Lo sai meglio di chiunque altro, tu che
hai passato i primi anni della vita tra le scaglie calde di Pyrion — il drago
rosso che tua madre aveva curato da un'ala spezzata e che aveva deciso, di sua
spontanea volontà, di non andarsene più. Sei cresciuta sentendo il suo respiro
come una seconda voce e imparando a leggere i fuochi di segnale che tracciava
nel cielo al tramonto: "pericolo", "pace", "torna a casa".
La tua armatura a scaglie non è cuoio — è un dono di Pyrion, scaglie cadute
durante la muta dell'anno in cui hai compiuto sedici anni, raccolte una a una
e intrecciate da tua madre in un'armatura che nessun fabbro umano avrebbe saputo
fare. La spada con il drago sull'elsa era nel tesoro di famiglia da generazioni:
dicevano che chi la brandisse con cuore puro sentisse nel polso il battito
di un fuoco antico.
Quando il Cavaliere del Drago è arrivato, Pyrion ha combattuto. È stato il
primo a cadere — tradito dalla corruzione del Drago Antico, lo stesso sangue ma
stravolto — e tu hai visto l'amico di una vita trasformarsi in fumo nero prima
che potessi raggiungerlo. Hai combattuto fino all'alba con la spada nella mano
destra e il ricordo di Pyrion nella sinistra. Poi sei partita.
Ogni chilometro è una scaglia del suo manto che porti con te. E quando arriverai
alla Vetta Oscura, il Cavaliere del Drago scoprirà che chi ha perso un drago non
teme più nulla — nemmeno un altro drago.`,
  },
  principessa_ghiacci: {
    title: 'La Principessa dei Ghiacci Eterni',
    text: `Oltre la Vetta Innevata, dove i cartografi scrivono solo "nulla" e si fermano,
c'è un palazzo di ghiaccio antico quanto il mondo. Non hai mai vissuto altrove: sei
cresciuta tra corridoi trasparenti che riflettono la luce del sole e la moltiplicano
in mille frammenti, e hai imparato a leggere le crepe nel ghiaccio come altri leggono
i libri. Tua madre ti insegnò che il ghiaccio non mente mai: conserva tutto ciò che
tocca esattamente com'era, senza abbellirlo e senza peggiorarlo.
La tua spada è stata forgiata da tuo padre con il ghiaccio antico del cuore del
palazzo — più duro del diamante, più tagliente di qualsiasi lama — e le rune incise
sul filo cantano quando soffia il vento del nord. L'hai impugnata per la prima volta
a dodici anni per difendere il palazzo da un branco di lupi ghiacciati; non hai mai
smesso di tenerla in mano da allora.
Il Cavaliere del Drago arrivò in un'alba di fiamma. Il fuoco incontrò il ghiaccio e
perse — ma non prima di spezzare la sigillatura che teneva il palazzo in piedi da
secoli. Hai visto le mura trasparenti diventare acqua, le torri crollare lentamente
come lacrime, e tua madre sciogliersi nel caos prima che tu potessi raggiungerla.
Di lei ti è rimasta solo la corona di ghiaccio vivo che porti — che non si scioglie
mai, perché il suo amore per te è già diventato qualcosa di più permanente del freddo.
Ora scendi dalle montagne per la prima volta nella tua vita, e il mondo scoprirà cosa
succede quando il gelo incontra la determinazione: il fuoco dell'Orda spegnerà se stesso.`,
  },
  predone: {
    title: 'Il Re dei Predoni',
    text: `Non hai mai chiesto il permesso a nessuno, e non hai intenzione di cominciare
adesso. Cresciuto ai margini delle terre di confine, hai imparato presto che le
leggi sono scritte dai potenti per proteggere se stessi — e che chi non ha nulla
da proteggere è libero come il vento.
La tua banda era la tua famiglia: sei compagni fidati, ognuno con la sua storia
e il suo segreto. Razziavate i convogli dell'Impero, ridistribuivate tra i
villaggi dimenticati ciò che sottraevate ai nobili, e dormivate sotto le stelle
con la certezza che nessuna prigione avrebbe retto abbastanza a lungo.
Poi arrivò l'Orda. In una notte sola, il Cavaliere del Drago trasformò le terre
di confine in cenere. I tuoi compagni si dispersero o caddero, e tu ti ritrovasti
solo, con il tuo mantello e la tua astuzia — e niente altro.
Sei in marcia da allora. Non per vendetta, non per gloria: per trovare quello che
l'Orda ha distrutto e riprenderti ciò che ti appartiene. Un passo alla volta,
un bottino alla volta. Il Re dei Predoni non chiede — conquista.`,
  },
};

function persist() { RPG.save(STATE); updateNotifState().catch(() => {}); }
function vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch {} }
function maybeSyncChallenge() {
  if (HERO && HERO.cloud && HERO.cloud.activeChallenge) FB.updateChallenge(HERO).catch(() => {});
}

/* ══════════════ Schermate ══════════════ */

function show(id) {
  document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('screen-enter'); });
  const s = $('#' + id);
  s.classList.remove('hidden');
  const tabbar = $('#tabbar');
  if (id === 'screen-game') {
    tabbar.classList.remove('tab-hidden');
  } else {
    tabbar.classList.add('tab-hidden');
  }
  requestAnimationFrame(() => s.classList.add('screen-enter'));
}

function emptyState(icon, text) {
  const d = el('div', 'empty-state');
  d.innerHTML = `<div class="empty-state-icon">${icon}</div><p class="empty-state-text">${esc(text)}</p>`;
  return d;
}

function renderProfiles() {
  const list = $('#profile-list');
  list.innerHTML = '';
  if (!STATE.heroes.length) {
    list.appendChild(emptyState('⚔️', 'Nessun eroe ancora. Tocca + per crearne uno!'));
  }
  STATE.heroes.forEach(h => {
    const storyId = (h.avatar || '').replace('assets/avatars/', '').replace('.png', '');
    const col = AVATAR_COLORS[storyId] || { bg: '#0e0804', glow: '#c9932e' };
    const avatarMeta = AVATARS.find(a => a.storyId === storyId);
    const classLabel = avatarMeta ? avatarMeta.label : '';
    const card = el('div', 'profile-card');
    card.style.setProperty('--phero-glow', col.glow + '30');
    card.style.setProperty('--phero-accent', col.glow);
    card.appendChild(avatarEl(h, 'profile-avatar'));
    const info = el('div', 'profile-info');
    info.innerHTML = `<span class="profile-hero-name">${esc(h.name)}</span>
      <span class="profile-hero-class">${esc(classLabel)}</span>
      <div class="profile-chips">
        <span class="profile-chip">Liv. ${h.level}</span>
        <span class="profile-chip">🏃 ${h.totalKm.toFixed(1)} km</span>
        <span class="profile-chip">🪙 ${h.gold}</span>
      </div>`;
    card.appendChild(info);
    const del = el('button', 'btn-delete', '🗑️');
    del.addEventListener('click', e => {
      e.stopPropagation();
      confirmDeleteHero(h);
    });
    card.appendChild(del);
    card.addEventListener('click', () => { STATE.current = h.id; persist(); enterGame(); });
    list.appendChild(card);
  });
  show('screen-profiles');
}

function confirmDeleteHero(h) {
  modal(`
    <h3 class="panel-title">🗑️ Cancellare ${esc(h.name)}?</h3>
    <p>Liv. ${h.level} · ${h.totalKm.toFixed(1)} km percorsi · ${h.cards.length} carte</p>
    <p class="muted small">Tutti i progressi di questo eroe andranno perduti per sempre. Il Custode del Tempo non potrà riportarli indietro.</p>
    <div class="row gap">
      <button class="btn wide" onclick="closeModal()">Annulla</button>
      <button class="btn wide btn-danger" id="btn-confirm-delete">Cancella</button>
    </div>
  `);
  $('#btn-confirm-delete').addEventListener('click', () => {
    RPG.deleteHero(STATE, h.id);
    persist();
    closeModal();
    renderProfiles();
  });
}

function avatarEl(hero, cls) {
  if (hero.avatar && (hero.avatar.startsWith('data:') || hero.avatar.startsWith('assets/'))) {
    const img = el('img', cls);
    img.loading = 'eager';
    img.src = hero.avatar;
    img.alt = hero.name;
    return img;
  }
  return el('div', cls + ' avatar-emoji', hero.avatar || '🧑‍🌾');
}
function isImageAvatar(hero) {
  return hero.avatar && (hero.avatar.startsWith('data:') || hero.avatar.startsWith('assets/'));
}

/* ── Creazione eroe — Card Cinematografica ── */
const AVATAR_LORE = {
  eroe1:       'Nato dalla cenere di Oakhaven, cammina per trovare risposte.',
  eroe2:       'Figlia dell\'erborista, conosce i segreti di ogni sentiero.',
  fabbro:      'Dal fuoco della forgia nasce l\'acciaio dei campioni.',
  stregone:    'Le stelle gli parlano. Lui risponde con fiamme.',
  alchimista:  'Trasforma sudore in oro, fatica in trionfo.',
  furfante:    'Veloce nel buio, invisibile alla luce.',
  maga:        'Tesse incantesimi con ogni passo, ogni respiro.',
  paladino:    'La fede è la sua armatura più pesante.',
  ranger:      'I boschi lo conoscono. Lui li conosce meglio.',
  fata:        'Dove cammina, fiorisce. Dove combatte, vince.',
  principe:    'Il sangue nobile non basta. Serve il coraggio.',
  principessa: 'Una corona non si eredita. Si conquista.',
  regina:      'Ha visto crollare regni. Il suo è ancora in piedi.',
  predone:     'Nessuna legge. Nessuna bandiera. Solo la strada e il bottino.',
  principessa_ghiacci: 'Il ghiaccio non mente. E lei nemmeno.',
  sacerdotessa_sole:   'La luce non si spegne. Si sposta.',
  principessa_draghi:  'Chi ha perso un drago non teme più nulla.',
};
const AVATAR_DIMS = {
  eroe1:{w:417,h:700}, eroe2:{w:535,h:535}, fabbro:{w:535,h:535},
  stregone:{w:535,h:535}, alchimista:{w:535,h:535}, furfante:{w:535,h:535},
  maga:{w:535,h:535}, paladino:{w:401,h:535}, fata:{w:601,h:700},
  principe:{w:529,h:700}, principessa:{w:542,h:700}, ranger:{w:368,h:700},
  regina:{w:558,h:700},
  principessa_ghiacci:{w:700,h:700},
  sacerdotessa_sole:  {w:700,h:700},
  principessa_draghi: {w:700,h:700},
};
const AVATAR_COLORS = {
  eroe1:       { bg: '#0d2215', glow: '#2e8b57' },
  eroe2:       { bg: '#1a0d22', glow: '#7b3fbf' },
  fabbro:      { bg: '#221508', glow: '#b07030' },
  stregone:    { bg: '#080d22', glow: '#3b5fcf' },
  alchimista:  { bg: '#062218', glow: '#2e8a6a' },
  furfante:    { bg: '#220808', glow: '#b03030' },
  maga:        { bg: '#1a082a', glow: '#af5fcf' },
  paladino:    { bg: '#1e1800', glow: '#c9b030' },
  ranger:      { bg: '#081a0a', glow: '#4aae5a' },
  fata:        { bg: '#100828', glow: '#7055cf' },
  principe:    { bg: '#1a1008', glow: '#c9882e' },
  principessa: { bg: '#22081a', glow: '#cf5aaf' },
  regina:      { bg: '#0d0218', glow: '#8a30cf' },
  predone:                { bg: '#1a0e00', glow: '#c97a2e' },
  principessa_ghiacci:   { bg: '#071a2e', glow: '#60c8f5' },
  sacerdotessa_sole:     { bg: '#1e1600', glow: '#f5c842' },
  principessa_draghi:    { bg: '#1e0800', glow: '#e05a20' },
};
let pickedAvatar = AVATARS[0];
let createIdx = 0;
let _createReady = false;
let _createTouchX = 0;

function renderCreate() {
  createIdx = Math.max(0, AVATARS.indexOf(pickedAvatar));
  if (!_createReady) {
    _createReady = true;
    $('#create-prev').addEventListener('click', () => {
      createIdx = (createIdx - 1 + AVATARS.length) % AVATARS.length;
      _updateCreate();
    });
    $('#create-next').addEventListener('click', () => {
      createIdx = (createIdx + 1) % AVATARS.length;
      _updateCreate();
    });
    const zone = $('#create-card-zone');
    zone.addEventListener('touchstart', e => { _createTouchX = e.touches[0].clientX; }, { passive: true });
    zone.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - _createTouchX;
      if (Math.abs(dx) > 40) {
        createIdx = (createIdx + (dx < 0 ? 1 : -1) + AVATARS.length) % AVATARS.length;
        _updateCreate();
      }
    }, { passive: true });
  }
  _updateCreate();
  show('screen-create');
}

function _updateCreate() {
  pickedAvatar = AVATARS[createIdx];
  const a = pickedAvatar;
  const col = AVATAR_COLORS[a.storyId] || { bg: '#0e0804', glow: '#c9932e' };
  $('#create-card-zone').style.background =
    `radial-gradient(ellipse at 50% 30%, ${col.glow}44 0%, ${col.bg} 58%, #060402 100%)`;
  const portrait = $('#create-portrait');
  portrait.style.setProperty('--portrait-glow', col.glow);
  portrait.style.opacity = '0';
  clearTimeout(portrait._t);
  portrait._t = setTimeout(() => {
    portrait.innerHTML = '';
    const img = document.createElement('img');
    img.src = a.path;
    img.className = 'create-portrait-img';
    img.onerror = () => { portrait.innerHTML = '<span style="font-size:5rem">⚔️</span>'; };
    portrait.appendChild(img);
    portrait.style.opacity = '1';
  }, 150);
  $('#create-class-name').textContent = a.label;
  $('#create-lore').textContent = AVATAR_LORE[a.storyId] || '';
  $('#create-dots').textContent = `${createIdx + 1} / ${AVATARS.length}`;
  const t = RPG.CLASS_TALENTS[a.storyId];
  $('#create-talent-name').textContent = t ? `${t.icon} ${t.name}` : '';
  $('#create-talent-desc').textContent = t ? t.desc : '';
}

function _createNameError(msg) {
  const e = $('#create-name-error');
  e.textContent = msg;
  e.classList.add('visible');
  clearTimeout(e._t);
  e._t = setTimeout(() => e.classList.remove('visible'), 3000);
}
function _doCreateConfirm() {
  const name = $('#create-name').value.trim();
  if (!name) { _createNameError('Ogni eroe ha bisogno di un nome!'); return; }
  const h = RPG.newHero(name, pickedAvatar.path);
  h.storyId = pickedAvatar.storyId;
  STATE.heroes.push(h);
  STATE.current = h.id;
  persist();
  enterGame();
}
$('#btn-new-hero').addEventListener('click', () => { $('#create-name').value = ''; $('#create-name-error').classList.remove('visible'); renderCreate(); });
$('#btn-create-back').addEventListener('click', renderProfiles);
$('#btn-create-confirm').addEventListener('click', _doCreateConfirm);
$('#create-name').addEventListener('keydown', e => { if (e.key === 'Enter') _doCreateConfirm(); });
$('#create-name').addEventListener('input', () => $('#create-name-error').classList.remove('visible'));

/* ══════════════ Gioco ══════════════ */

function enterGame() {
  HERO = STATE.heroes.find(h => h.id === STATE.current);
  if (!HERO) { renderProfiles(); return; }
  RPG.migrateHero(HERO);
  show('screen-game');
  renderHUD();
  setTab('camp');
  setupNotifications();
  // Rollover incursione + boss + mappa tesoro
  const missed = RPG.rolloverIncursion(HERO);
  RPG.rolloverWeeklyBoss(HERO);
  RPG.rolloverTreasureMap(HERO);
  // Assegna retroattivamente i punti abilità per i livelli già guadagnati
  RPG.earnSkillPoints(HERO);
  // Controlla danno edifici per inattività
  RPG.checkBuildingDamage(HERO);
  // Mercante Fuggiasco (aggiorna giornalmente)
  RPG.rolloverFugitiveMerchant(HERO);
  // Mappa Infuocata (aggiorna settimanalmente)
  RPG.rolloverMappaInfuocata(HERO);
  // Serra del Viandante (aggiorna giornalmente)
  const serraLogs = RPG.rolloverGreenhouse(HERO);
  if (serraLogs && serraLogs.length) {
    serraLogs.forEach(msg => OPEN_QUEUE.push(() => modal(`
      <h3 class="panel-title">🌿 Serra del Viandante</h3>
      <p class="center" style="font-size:1.5rem">🌱</p>
      <p class="center">${msg}</p>
      <button class="btn btn-primary wide" onclick="nextOpening()">Capito!</button>`)));
  }
  // Salva streak prima del login giornaliero (per rilevare rottura)
  const preStreakCount = HERO.streak.count;
  // Tesoro Giornaliero
  const login = RPG.dailyLogin(HERO);
  const streakBroke = login && preStreakCount > 1 && HERO.streak.count === 1;
  persist();
  renderHUD();

  // Sincronizza il profilo su Firestore all'avvio (popola la classifica globale)
  FB.syncHero(HERO);

  // Sincronizzazione automatica da Apple Salute (URL params o clipboard)
  const healthReport = applyHealthSyncFromURL(HERO);
  if (healthReport) { persist(); renderHUD(); maybeSyncChallenge(); }

  // Coda dei popup di apertura
  OPEN_QUEUE = [];
  if (healthReport) OPEN_QUEUE.push(() => showHealthSyncResult(healthReport));

  // Sync passi: disponibile inline nel tab Allenati (non più popup automatico)
  if (missed) {
    const it = missed.lostItem;
    const rarInfo = it ? RPG.RARITIES[it.rarity] : (missed.minRarity ? RPG.RARITIES[missed.minRarity] : null);
    const rarKey = it ? it.rarity : missed.minRarity;
    const itemImg = it ? RPG.itemImg(it) : null;
    const itemVisual = it
      ? (itemImg
          ? `<img class="nm-item-img" src="${itemImg}" alt="" onerror="this.outerHTML='<span class=nm-item-emoji>${it.icon}</span>'">`
          : `<span class="nm-item-emoji">${it.icon}</span>`)
      : `<span class="nm-item-emoji">🎁</span>`;
    const itemName = it ? esc(it.name) : esc(missed.name);
    const rarLabel = rarInfo ? rarInfo.label : '';
    OPEN_QUEUE.push(() => modal(`
      <h3 class="panel-title">💨 Bottino Perduto…</h3>
      <div class="nm-item-wrap">
        <div class="nm-item-veil rar-${rarKey}">
          ${itemVisual}
        </div>
        ${rarInfo ? `<div class="nm-rarity-chip rar-chip-${rarKey}">${rarLabel}</div>` : ''}
      </div>
      <p class="center nm-item-name"><b>${itemName}</b></p>
      <p class="muted center nm-miss-text">Ha portato con sé questo oggetto. Ti mancavano solo <b>${missed.kmMissing} km</b> per reclamarlo!</p>
      <button class="btn btn-primary wide" onclick="nextOpening()">Domani non scapperà!</button>`));
  }
  if (streakBroke) OPEN_QUEUE.push(() => showStreakFreezeOffer(preStreakCount));
  if (login) { window._pendingLogin = login; OPEN_QUEUE.push(showDailyLogin); }
  // La Taglia è stata reclamata dall'altro eroe?
  const ev = RPG.weeklyEvent(STATE);
  if (ev.claimedBy && ev.claimedBy !== HERO.name && HERO.eventNotified !== ev.week) {
    HERO.eventNotified = ev.week;
    persist();
    OPEN_QUEUE.push(() => modal(`
      <h3 class="panel-title">⛔ Taglia Sfumata!</h3>
      <p class="center" style="font-size:2.5rem">${ev.icon}</p>
      <p class="center"><b>${esc(ev.claimedBy)}</b> ha reclamato <b>${ev.skin}</b> prima di te.</p>
      <p class="muted small center">La prossima Taglia arriva tra <span data-cd="week">…</span>. Stavolta non farti battere!</p>
      <button class="btn btn-primary wide" onclick="nextOpening()">La prossima è mia</button>`));
  }
  // Recap mensile (primo accesso del nuovo mese)
  const curMonth = RPG.monthStamp();
  if (HERO.lastRecapMonth !== curMonth) {
    const recap = RPG.getMonthlyRecap(HERO);
    HERO.lastRecapMonth = curMonth;
    persist();
    if (recap) OPEN_QUEUE.push(() => showMonthlyRecap(recap));
  }
  // Riepilogo "cosa ti aspetta oggi" (una volta al giorno, non al primo accesso)
  if (HERO.summarySeen !== todayISO() && (HERO.totalKm || 0) > 0) {
    HERO.summarySeen = todayISO();
    persist();
    OPEN_QUEUE.push(showDailySummary);
  }
  // Tutorial per i nuovi eroi (mostrato prima di tutto il resto)
  if (!HERO.tutorialDone) OPEN_QUEUE.unshift(showTutorial);
  // Lettere dal mondo (milestone di livello, km, streak)
  RPG.checkPendingLetters(HERO).forEach(letter => OPEN_QUEUE.push(() => showWorldLetter(letter)));
  nextOpening();

  // Inviti PvP in arrivo da Firestore
  (async () => {
    const invites = await FB.getPendingInvites(HERO.id);
    if (!invites.length) return;
    invites.forEach(inv => OPEN_QUEUE.push(() => showChallengeInviteModal(inv)));
    if (document.getElementById('modal').classList.contains('hidden')) nextOpening();
  })();
}

/* ══════════════ Tutorial ══════════════ */
const TUTORIAL_SLIDES = [
  {
    icon: '🌟',
    title: 'Benvenuto ad Oakhaven',
    text: 'Hero\'s Pace trasforma ogni km che percorri nella vita reale in XP, oro e avventure. Più ti alleni, più il tuo eroe diventa leggendario.',
    art: `<div class="tut-art tut-art-world">🏔️🌲🗺️</div>`,
  },
  {
    icon: '🏃',
    title: 'Allenati. Cresci. Conquista.',
    text: 'Registra camminata, corsa o cyclette nella scheda <b>Allenati</b>. Ogni sessione porta XP, oro, risorse e oggetti rari.',
    art: `<div class="tut-art tut-art-tabs"><span class="tut-tab">🏕️</span><span class="tut-tab">🗺️</span><span class="tut-tab tut-tab-active">⚔️</span><span class="tut-tab">🏘️</span><span class="tut-tab">👤</span></div>`,
  },
  {
    icon: '🏕️',
    title: 'Il tuo Rifugio',
    text: 'Il Rifugio è la tua base. Costruisci strutture che danno bonus permanenti, alleva un <b>Famiglio</b> e gestisci la tua <b>Serra</b>.',
    art: `<div class="tut-art tut-art-camp">🏕️<div class="tut-art-sparkles">✨</div></div>`,
  },
  {
    icon: '⚔️',
    title: 'L\'Arena & la Mappa',
    text: 'Sfida i villain nell\'<b>Arena</b> ogni giorno per oro e bottino. Percorri km sulla <b>Mappa</b> per sbloccare boss e forzieri del tesoro.',
    art: `<div class="tut-art tut-art-arena">⚔️ vs 👹</div>`,
  },
  {
    icon: '💊',
    title: 'Consumabili & Sacca',
    text: 'Trova consumabili nell\'Arena, nei forzieri e dall\'<b>Erborista</b> nel Mercato. Usali prima di allenarti per moltiplicare le ricompense.',
    art: `<div class="tut-art tut-art-items">⚗️🌿🔮🎒</div>`,
  },
  {
    icon: '🔥',
    title: 'Inizia il tuo viaggio!',
    text: 'Il primo passo è registrare il tuo primo allenamento. Vai nella scheda <b>Allenati</b>, inserisci tipo e km — e che la leggenda abbia inizio!',
    art: `<div class="tut-art tut-art-start"><span class="tut-start-pulse">⚔️</span></div>`,
  },
];

function showTutorial() {
  let idx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';

  function render() {
    const s = TUTORIAL_SLIDES[idx];
    const isLast = idx === TUTORIAL_SLIDES.length - 1;
    const dots = TUTORIAL_SLIDES.map((_, i) =>
      `<span class="tutorial-dot${i === idx ? ' active' : ''}"></span>`
    ).join('');
    overlay.innerHTML = `
      <div class="tutorial-card">
        <button class="tutorial-skip" aria-label="Salta">✕</button>
        ${s.art || `<div class="tutorial-icon">${s.icon}</div>`}
        <div class="tutorial-title">${s.title}</div>
        <div class="tutorial-text">${s.text}</div>
        <div class="tutorial-dots">${dots}</div>
        <button class="btn btn-primary tutorial-btn">
          ${isLast ? '🔥 Inizia l\'avventura!' : 'Avanti →'}
        </button>
      </div>`;
    overlay.querySelector('.tutorial-skip').addEventListener('click', close);
    overlay.querySelector('.tutorial-btn').addEventListener('click', () => {
      if (isLast) close(); else { idx++; render(); }
    });
  }

  function close() {
    overlay.classList.add('tutorial-out');
    setTimeout(() => { overlay.remove(); }, 300);
    HERO.tutorialDone = true;
    if (HERO.onboardingStep < 1) HERO.onboardingStep = 1;
    persist();
    updateTabOnboardingPulse();
    nextOpening();
    setTab('train');
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('tutorial-in'));
}

function updateTabOnboardingPulse() {
  const trainTab = document.querySelector('#tabbar .tab[data-tab="train"]');
  if (!trainTab) return;
  const showPulse = HERO && HERO.onboardingStep === 1;
  trainTab.classList.toggle('tab-onboarding-pulse', showPulse);
}

function showFirstWorkoutCelebration() {
  const ov = document.createElement('div');
  ov.className = 'first-workout-overlay';
  ov.innerHTML = `
    <div class="fwo-card">
      <div class="fwo-sparkles" aria-hidden="true">✨ ⭐ ✨</div>
      <div class="fwo-icon">🏆</div>
      <h2 class="fwo-title">Primo Allenamento!</h2>
      <p class="fwo-sub">Hai mosso il tuo eroe per la prima volta.<br>La leggenda di Oakhaven è iniziata.</p>
      <div class="fwo-hints">
        <div class="fwo-hint"><span class="fwo-hint-icon">🏕️</span><div><b>Rifugio</b><br><span class="small">Costruisci strutture per avere bonus permanenti.</span></div></div>
        <div class="fwo-hint"><span class="fwo-hint-icon">⚔️</span><div><b>Arena</b><br><span class="small">Sfida i villain ogni giorno per oro e bottino.</span></div></div>
        <div class="fwo-hint"><span class="fwo-hint-icon">🌿</span><div><b>Erborista</b><br><span class="small">Acquista consumabili per potenziare i tuoi allenamenti.</span></div></div>
      </div>
      <button class="btn btn-primary wide fwo-btn">🔥 Vai al Rifugio!</button>
    </div>`;
  document.body.appendChild(ov);
  sfx('level');
  requestAnimationFrame(() => ov.classList.add('fwo-in'));
  ov.querySelector('.fwo-btn').addEventListener('click', () => {
    ov.classList.add('fwo-out');
    setTimeout(() => ov.remove(), 300);
    setTab('camp');
  });
}

function showDailyLogin() {
  const login = window._pendingLogin;
  if (!login) return;
  window._pendingLogin = null;
  const idx = ((login.day - 1) % 7) + 1;
  let days = '';
  for (let d = 1; d <= 7; d++) {
    const filled = d < idx;
    const today = d === idx;
    const special = d === 7;
    const cls = ['login-day-cell', filled ? 'filled' : '', today ? 'today' : '', special ? 'special' : ''].filter(Boolean).join(' ');
    const icon = special ? '🎁' : today ? '✨' : filled ? '✓' : d;
    days += `<div class="${cls}">
      <div class="login-day-pip">${icon}</div>
      <div class="login-day-label">Giorno ${d}</div>
    </div>`;
  }
  let html = `<div class="login-modal-wrap">
    <div class="lup-badge" style="font-size:.8rem;letter-spacing:.14em">Il Tesoro Giornaliero</div>
    <div class="login-streak-label">Giorno <b>${login.day}</b> di fila!</div>
    <div class="login-day-wrap">${days}</div>
    <div class="login-gold-reward">🪙 +${login.gold} monete</div>`;
  if (login.item) {
    html += `<div class="login-item-reveal">${itemHtml(login.item)}</div>
      <p class="small muted center">Bonus del 7° giorno!</p>`;
  }
  html += `<p class="small muted center" style="margin-top:8px">Torna domani — il tesoro cresce ogni giorno.<br>Se salti un giorno, riparte da capo!</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">✨ Riscuoti il Tesoro</button>
  </div>`;
  modal(html);
  sfx('coin');
  vibrate(80);
}

/* ── Streak freeze offer ──────────────────────────────────── */
function showStreakFreezeOffer(savedCount) {
  const canAfford = HERO.gold >= 500;
  modal(`
    <h3 class="panel-title">💔 Striscia Spezzata!</h3>
    <div class="streak-broke-wrap">
      <div class="streak-broke-flames">${'🔥'.repeat(Math.min(savedCount, 5))}</div>
      <div class="streak-broke-count">${savedCount} giorni di fila</div>
      <div class="streak-broke-sub">La tua striscia si è interrotta. Hai saltato un giorno.</div>
    </div>
    <div class="streak-freeze-offer">
      <div class="streak-freeze-title">❄️ Congela la Striscia</div>
      <div class="streak-freeze-desc">Paga 500 🪙 per restaurare la tua striscia di <b>${savedCount}</b> giorni e continuare senza perdere i bonus.</div>
      <button class="btn btn-primary wide" id="btn-streak-freeze" ${canAfford ? '' : 'disabled'} onclick="doStreakFreeze(${savedCount})">
        ${canAfford ? '❄️ Congela · 500 🪙' : '❄️ Oro insufficiente · 500 🪙'}
      </button>
    </div>
    <button class="btn wide" style="margin-top:.5rem;opacity:.7" onclick="nextOpening()">Accetta la sconfitta</button>`);
}

window.doStreakFreeze = function(savedCount) {
  const err = RPG.restoreStreak(HERO, savedCount);
  if (err) { toast(err); return; }
  persist(); renderHUD();
  vibrate([100, 50, 100, 50, 200]);
  sfx('coin');
  modal(`
    <h3 class="panel-title">❄️ Striscia Salvata!</h3>
    <div class="streak-saved-wrap">
      <div class="streak-broke-flames">${'🔥'.repeat(Math.min(savedCount + 1, 5))}</div>
      <div class="streak-broke-count">${savedCount + 1} giorni di fila</div>
    </div>
    <p class="muted center">Il gelo arcano ha preservato la tua striscia. Non deludere il Viandante!</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">Avanti!</button>`);
};

/* Popup dettaglio risorse (tocco sulle risorse in alto a destra) */
function showResources() {
  modal(`
    <h3 class="panel-title">🎒 Le tue Risorse</h3>
    <div class="res-detail"><span class="res-detail-icon">🪙</span><div><b>Moneta d'Oro</b><br><span class="small muted">La valuta del reame: compra cavalcature, armi e armature.</span></div><b class="res-detail-qty">${HERO.gold}</b></div>
    <div class="res-detail"><span class="res-detail-icon">🪵</span><div><b>Legno</b><br><span class="small muted">Materiale da costruzione per il tuo Rifugio.</span></div><b class="res-detail-qty">${HERO.wood}</b></div>
    <div class="res-detail"><span class="res-detail-icon">🪨</span><div><b>Roccia</b><br><span class="small muted">Pietra grezza per le strutture più solide.</span></div><b class="res-detail-qty">${HERO.stone}</b></div>
    <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>
  `);
}

function renderHUD() {
  const av = $('#hud-avatar');
  av.innerHTML = '';
  av.appendChild(avatarEl(HERO, 'hud-avatar-inner'));
  // accent color from hero class
  const _sid = (HERO.avatar || '').replace('assets/avatars/', '').replace('.png', '');
  const _col = AVATAR_COLORS[_sid] || { glow: 'var(--gold)' };
  av.style.boxShadow = `0 0 10px ${_col.glow}70, 0 0 0 2px ${_col.glow}`;
  av.style.borderRadius = '50%';
  $('#hud-name').textContent = HERO.name;
  $('#hud-title').textContent = `Liv. ${HERO.level} — ${RPG.heroTitle(HERO.level)}`;
  const need = RPG.xpForLevel(HERO.level);
  const pct = Math.min(100, Math.round(HERO.xp / need * 100));
  $('#hud-xpfill').style.width = pct + '%';
  $('#hud-xptext').textContent = `${HERO.xp} / ${need} XP`;
  // streak progressiva + pvp title
  const sc = HERO.streak && HERO.streak.count || 0;
  let streakHtml = '';
  if (sc >= 30)      streakHtml = ` <span class="streak-chip streak-chip-l">🩵${sc}</span>`;
  else if (sc >= 15) streakHtml = ` <span class="streak-chip streak-chip-m">🔥${sc}</span>`;
  else if (sc >= 5)  streakHtml = ` <span class="streak-chip streak-chip-s">🔥${sc}</span>`;
  else if (sc > 1)   streakHtml = ` · 🔥${sc}`;
  const ptHud = pvpTitle(HERO.pvpWins || 0);
  const pvpSuffix = ptHud ? ` · ${ptHud.icon} ${ptHud.label}` : '';
  const baseTitleText = `Liv. ${HERO.level} — ${RPG.heroTitle(HERO.level)}`;
  $('#hud-title').innerHTML = baseTitleText + streakHtml + pvpSuffix;
  // barra che "esplode" vicino al level-up + prossimo sblocco
  const bar = document.querySelector('.xpbar');
  let next = $('#hud-next');
  if (!next) { next = el('div', 'hud-next'); next.id = 'hud-next'; $('.hud-info').appendChild(next); }
  if (need - HERO.xp > 0 && HERO.xp / need >= 0.9) {
    bar.classList.add('almost');
    const kmLeft = Math.max(0.1, (need - HERO.xp) / 15).toFixed(1);
    next.innerHTML = `⚡ Ti bastano <b>${kmLeft} km</b> per il Livello ${HERO.level + 1}!`;
    next.classList.add('hot');
  } else {
    bar.classList.remove('almost');
    next.classList.remove('hot');
    const nu = nextUnlock(HERO);
    next.innerHTML = nu ? `${nu.icon} Liv. ${nu.level}: ${nu.text} <span class="hud-next-in">(tra ${nu.inLv} liv.)</span>` : '';
  }
  bumpRes('res-gold', HERO.gold);
  bumpRes('res-wood', HERO.wood);
  bumpRes('res-stone', HERO.stone);
  updateBadges();
}

function bumpRes(id, newVal) {
  const span = $('#' + id);
  if (!span) return;
  const old = parseInt(span.textContent);
  span.textContent = newVal;
  if (!isNaN(old) && newVal > old) {
    span.classList.remove('res-bump');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => span.classList.add('res-bump'));
    });
    span.addEventListener('animationend', () => span.classList.remove('res-bump'), { once: true });
    const diff = newVal - old;
    const floatEl = document.createElement('span');
    floatEl.className = 'res-float';
    floatEl.textContent = `+${diff}`;
    const resDiv = span.closest('.res');
    if (resDiv) {
      resDiv.appendChild(floatEl);
      floatEl.addEventListener('animationend', () => floatEl.remove(), { once: true });
    }
  }
}

let _tabClickTs = 0;
document.querySelectorAll('#tabbar .tab').forEach(t =>
  t.addEventListener('click', () => {
    const now = Date.now();
    if (now - _tabClickTs < 280) return;
    _tabClickTs = now;
    setTab(t.dataset.tab);
  }));

// Swipe orizzontale su #tab-content → cambia tab
const _TAB_ORDER = ['camp', 'map', 'train', 'market', 'hero'];
let _swX = null, _swY = null;
document.addEventListener('touchstart', e => {
  if ($('#screen-game').classList.contains('hidden')) return;
  _swX = e.touches[0].clientX; _swY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (_swX === null) return;
  const dx = e.changedTouches[0].clientX - _swX;
  const dy = e.changedTouches[0].clientY - _swY;
  _swX = null; _swY = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  if (document.getElementById('modal').classList.contains('hidden') === false) return;
  const idx = _TAB_ORDER.indexOf(CURRENT_TAB);
  if (dx < 0 && idx > 0) setTab(_TAB_ORDER[idx - 1], 'right');
  if (dx > 0 && idx < _TAB_ORDER.length - 1) setTab(_TAB_ORDER[idx + 1], 'left');
}, { passive: true });


// Tocco sulle risorse dell'header → popup dettaglio
document.querySelector('.hud-right').addEventListener('click', () => { if (HERO) showResources(); });

function setTab(tab, dir) {
  const c = $('#tab-content');
  const prevTab      = CURRENT_TAB;
  const prevScroll   = c.scrollTop;
  const prevCampView = CAMP_VIEW;
  const prevMapView  = MAP_VIEW;
  const prevHeroView = HERO_VIEW;

  CURRENT_TAB = tab;
  document.querySelectorAll('#tabbar .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  c.classList.remove('bg-parchment', 'bg-rifugio', 'bg-map', 'bg-train', 'bg-market');
  if (tab === 'hero')   c.classList.add('bg-parchment');
  if (tab === 'camp')   c.classList.add('bg-parchment');
  if (tab === 'map')    c.classList.add('bg-map');
  if (tab === 'train')  c.classList.add('bg-train');
  if (tab === 'market') c.classList.add('bg-market');
  c.classList.remove('tab-in', 'tab-slide-left', 'tab-slide-right');
  c.innerHTML = '';
  ({ camp: renderCamp, map: renderMap, train: renderTrain, market: renderMarket, hero: renderHero }[tab])(c);

  const sameSubView = tab === prevTab && !dir &&
    (tab !== 'camp'   || CAMP_VIEW === prevCampView) &&
    (tab !== 'map'    || MAP_VIEW  === prevMapView)  &&
    (tab !== 'hero'   || HERO_VIEW === prevHeroView);
  c.scrollTop = sameSubView ? prevScroll : 0;

  requestAnimationFrame(() => {
    if (dir === 'left')       c.classList.add('tab-slide-left');
    else if (dir === 'right') c.classList.add('tab-slide-right');
    else                      c.classList.add('tab-in');
  });
  updateBadges();
  if (HERO) updateTabOnboardingPulse();
}

/* ── TAB: Rifugio ── */
let CAMP_VIEW = 'main';

function getCampTimePhase() {
  const now  = new Date();
  const t    = now.getHours() + now.getMinutes() / 60;
  if (t >= 5.5 && t < 8)    return 'dawn';
  if (t >= 8   && t < 18)   return 'day';
  if (t >= 18  && t < 20.5) return 'dusk';
  return 'night';
}

function drawCampStars(canvas, phase) {
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  if (!w || !h) return;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (phase === 'day') return;
  const alpha = phase === 'night' ? 1 : phase === 'dawn' ? 0.5 : 0.25;
  const count = phase === 'night' ? 90 : 30;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h * 0.62;
    const r = Math.random() * 1.3 + 0.3;
    ctx.globalAlpha = (Math.random() * 0.55 + 0.45) * alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function showResizeBubble(elem, key, panorama, baseZ, baseWidth) {
  document.querySelectorAll('.camp-resize-bubble').forEach(b => b.remove());

  const bubble = document.createElement('div');
  bubble.className = 'camp-resize-bubble';

  function getW() { return parseFloat(elem.style.width) || baseWidth || 15; }
  function applyWidth(newW) {
    newW = Math.max(5, Math.min(55, newW));
    elem.style.width = newW + '%';
    lbl.textContent = Math.round(newW) + '%';
    HERO.campLayout = HERO.campLayout || {};
    HERO.campLayout[key] = {
      left:   parseFloat(elem.style.left)   || 0,
      bottom: parseFloat(elem.style.bottom) || 0,
      width:  newW
    };
    persist();
  }

  const minusBtn = document.createElement('button');
  minusBtn.className = 'crb-btn';
  minusBtn.textContent = '−';
  minusBtn.addEventListener('click', e => { e.stopPropagation(); applyWidth(getW() - 3); });

  const lbl = document.createElement('span');
  lbl.className = 'crb-label';
  lbl.textContent = Math.round(getW()) + '%';

  const plusBtn = document.createElement('button');
  plusBtn.className = 'crb-btn';
  plusBtn.textContent = '+';
  plusBtn.addEventListener('click', e => { e.stopPropagation(); applyWidth(getW() + 3); });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'crb-close';
  closeBtn.textContent = '✓';
  closeBtn.addEventListener('click', e => { e.stopPropagation(); bubble.remove(); });

  bubble.append(minusBtn, lbl, plusBtn, closeBtn);

  const eRect = elem.getBoundingClientRect();
  const pRect = panorama.getBoundingClientRect();
  const bLeft = Math.max(4, Math.min(eRect.left - pRect.left + eRect.width / 2 - 80, pRect.width - 170));
  const bTop  = Math.max(4, eRect.top - pRect.top - 50);
  bubble.style.cssText = `position:absolute;left:${bLeft}px;top:${bTop}px;z-index:50`;

  panorama.appendChild(bubble);

  const dismiss = e => {
    if (!bubble.contains(e.target) && e.target !== elem) {
      bubble.remove();
      document.removeEventListener('touchstart', dismiss);
      document.removeEventListener('mousedown', dismiss);
    }
  };
  setTimeout(() => {
    document.addEventListener('touchstart', dismiss, { passive: true });
    document.addEventListener('mousedown', dismiss);
  }, 0);
}

function makeCampLayerDraggable(elem, key, panorama, baseZ, baseWidth) {
  elem.classList.add('camp-layer-draggable');
  let dragging = false, pinching = false, hasMoved = false;
  let startCX, startCY, startL, startB, startPinchDist, startWidth;

  function getW() { return parseFloat(elem.style.width) || baseWidth || 15; }

  function beginDrag(cx, cy) {
    dragging = true; hasMoved = false;
    startCX = cx; startCY = cy;
    startL  = parseFloat(elem.style.left)   || 0;
    startB  = parseFloat(elem.style.bottom) || 0;
    elem.style.zIndex = 99;
    elem.classList.add('camp-drag-active');
  }
  function moveDrag(cx, cy) {
    if (!dragging) return;
    const dx = cx - startCX, dy = cy - startCY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved = true;
    const r = panorama.getBoundingClientRect();
    elem.style.left   = Math.max(0, Math.min(90, startL + dx / r.width  * 100)) + '%';
    elem.style.bottom = Math.max(0, Math.min(80, startB - dy / r.height * 100)) + '%';
  }

  function beginPinch(t0, t1) {
    pinching = true; dragging = false; hasMoved = true;
    startPinchDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    startWidth = getW();
    startCX = (t0.clientX + t1.clientX) / 2;
    startCY = (t0.clientY + t1.clientY) / 2;
    startL  = parseFloat(elem.style.left)   || 0;
    startB  = parseFloat(elem.style.bottom) || 0;
    elem.style.zIndex = 99;
    elem.classList.add('camp-drag-active');
  }
  function movePinch(t0, t1) {
    if (!pinching) return;
    const dist  = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    const scale = dist / (startPinchDist || 1);
    const newW  = Math.max(5, Math.min(55, startWidth * scale));
    const cx    = (t0.clientX + t1.clientX) / 2;
    const cy    = (t0.clientY + t1.clientY) / 2;
    const r     = panorama.getBoundingClientRect();
    elem.style.width  = newW + '%';
    elem.style.left   = Math.max(0, Math.min(90, startL + (cx - startCX) / r.width  * 100)) + '%';
    elem.style.bottom = Math.max(0, Math.min(80, startB - (cy - startCY) / r.height * 100)) + '%';
  }

  function endAll() {
    if (!dragging && !pinching) return;
    const wasDragging = dragging, didMove = hasMoved;
    dragging = false; pinching = false; hasMoved = false;
    elem.style.zIndex = baseZ;
    elem.classList.remove('camp-drag-active');
    if (wasDragging && !didMove) {
      showResizeBubble(elem, key, panorama, baseZ, baseWidth);
      return;
    }
    HERO.campLayout = HERO.campLayout || {};
    HERO.campLayout[key] = {
      left:   parseFloat(elem.style.left),
      bottom: parseFloat(elem.style.bottom),
      width:  parseFloat(elem.style.width) || baseWidth
    };
    persist();
  }

  // Touch
  elem.addEventListener('touchstart', e => {
    e.stopPropagation();
    if (e.touches.length === 2) beginPinch(e.touches[0], e.touches[1]);
    else if (e.touches.length === 1) beginDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  elem.addEventListener('touchmove', e => {
    if (!dragging && !pinching) return;
    e.preventDefault(); e.stopPropagation();
    if (e.touches.length === 2 && pinching) movePinch(e.touches[0], e.touches[1]);
    else if (e.touches.length === 1 && dragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  elem.addEventListener('touchend',    () => endAll(), { passive: true });
  elem.addEventListener('touchcancel', () => endAll(), { passive: true });

  // Mouse (desktop)
  elem.addEventListener('mousedown', e => {
    e.preventDefault();
    beginDrag(e.clientX, e.clientY);
    const mm = e2 => moveDrag(e2.clientX, e2.clientY);
    const mu = () => { endAll(); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}

function renderCamp(c) {
  if (CAMP_VIEW === 'santuario')   { renderSantuarioView(c);   return; }
  if (CAMP_VIEW === 'strutture')   { renderStruttureView(c);   return; }
  if (CAMP_VIEW === 'arredamento') { renderArredamentoView(c); return; }
  if (CAMP_VIEW === 'serra')       { renderSerraView(c);       return; }

  /* ── Panorama scena campo con ciclo giorno/notte ── */
  const phase       = getCampTimePhase();
  const campLevel   = HERO.level || 1;
  const stageIdx    = RPG.campStageForLevel(campLevel);
  const stageLabel  = RPG.CAMP_STAGES[stageIdx]?.label || 'Accampamento';
  const layers      = RPG.campUnlockedLayers(HERO);
  const mount       = HERO.mount ? RPG.mountById(HERO.mount) : null;
  const petSpeciesInfo = HERO.pet ? RPG.PET_SPECIES[HERO.pet.species] : null;
  const isNightTime = phase === 'night' || phase === 'dusk';

  const panorama = el('div', 'camp-panorama');
  panorama.dataset.phase = phase;
  panorama.dataset.stage = stageIdx;

  // 1. Sky gradient — fallback visibile solo se bg non carica (z:1)
  panorama.appendChild(el('div', 'camp-sky'));

  // 2. Stelle (z:2)
  const starsCanvas = document.createElement('canvas');
  starsCanvas.className = 'camp-stars';
  panorama.appendChild(starsCanvas);

  // 3. Background stage — <img> object-fit:cover, no inset shorthand (compatibilità iOS Safari < 14.5)
  const bgImg = document.createElement('img');
  bgImg.className = 'camp-bg-stage-img';
  bgImg.src = `assets/rifugio/scene/bg_stage${stageIdx}.jpg`;
  bgImg.alt = '';
  bgImg.style.cssText = 'position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;z-index:3';
  panorama.appendChild(bgImg);

  // 4. Night veil overlay (z:5)
  panorama.appendChild(el('div', 'camp-night-veil'));

  // 5. Layer PNG da CAMP_LAYERS (ordinati per z)
  const sortedLayers = [...layers].sort((a, b) => a.z - b.z);
  for (const layer of sortedLayers) {
    if (layer.id === 'campfire') {
      // Campfire: prova PNG, fallback SVG animato inline
      const cfWrap = el('div', 'camp-layer camp-campfire-wrap camp-layer-appear');
      const cfSv = HERO.campLayout?.campfire;
      const cfL  = cfSv ? cfSv.left   : layer.left;
      const cfB  = cfSv ? cfSv.bottom : layer.bottom;
      const cfW  = cfSv ? cfSv.width  : layer.width;
      cfWrap.style.cssText = `left:${cfL}%;bottom:${cfB}%;width:${cfW}%;z-index:${layer.z}`;
      const cfImg = document.createElement('img');
      cfImg.className = 'camp-campfire-img';
      cfImg.src = `assets/rifugio/scene/campfire_${isNightTime ? 'night' : 'day'}.png`;
      cfImg.alt = '';
      cfImg.onerror = () => {
        cfImg.remove();
        cfWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" style="width:100%;height:auto;display:block;overflow:visible">
          <defs><radialGradient id="fg1" cx="50%" cy="85%" r="55%"><stop offset="0%" stop-color="#ff7700" stop-opacity=".5"/><stop offset="100%" stop-color="#ff4400" stop-opacity="0"/></radialGradient></defs>
          <ellipse cx="50" cy="105" rx="42" ry="10" fill="url(#fg1)"/>
          <rect x="16" y="90" width="68" height="11" rx="5.5" fill="#3b1e05" transform="rotate(-14 50 95)"/>
          <rect x="16" y="90" width="68" height="11" rx="5.5" fill="#4a2608" transform="rotate(14 50 95)"/>
          <ellipse cx="28" cy="97" rx="8" ry="6" fill="#2e2926"/><ellipse cx="72" cy="97" rx="8" ry="6" fill="#2e2926"/>
          <ellipse cx="50" cy="101" rx="8" ry="5" fill="#242120"/>
          <path d="M50,84 C36,76 28,56 36,40 C39,52 43,53 46,46 C48,38 44,25 50,12 C56,25 52,38 54,46 C57,53 61,52 64,40 C72,56 64,76 50,84Z" fill="#e85000" opacity=".85"><animateTransform attributeName="transform" type="scale" values="1,1;.96,1.05;1.02,.98;1,1" dur="1.3s" repeatCount="indefinite" additive="sum" transformOrigin="50 84"/><animateTransform attributeName="transform" type="translate" values="0,0;1.5,-2;-1,-1;0,0" dur=".95s" repeatCount="indefinite" additive="sum"/></path>
          <path d="M50,78 C40,70 35,54 41,42 C43,51 46,52 47.5,46 C49,40 47,30 50,20 C53,30 51,40 52.5,46 C54,52 57,51 59,42 C65,54 60,70 50,78Z" fill="#ff7700"><animateTransform attributeName="transform" type="scale" values="1,1;.93,1.07;1.03,.97;1,1" dur="1.0s" repeatCount="indefinite" additive="sum" transformOrigin="50 78"/><animateTransform attributeName="transform" type="translate" values="0,0;-1.5,-2;1,-1;0,0" dur=".8s" repeatCount="indefinite" additive="sum"/></path>
          <path d="M50,70 C43,63 40,51 44,42 C45.5,49 47,50 48,46 C49,41 47.5,34 50,26 C52.5,34 51,41 52,46 C53,50 54.5,49 56,42 C60,51 57,63 50,70Z" fill="#ffa020"><animateTransform attributeName="transform" type="scale" values="1,1;.94,1.07;1,1" dur=".85s" repeatCount="indefinite" additive="sum" transformOrigin="50 70"/></path>
          <path d="M50,62 C45,57 43,48 46,41 C47,47 48,48 49,45 C49.5,41 48.5,35 50,29 C51.5,35 50.5,41 51,45 C52,48 53,47 54,41 C57,48 55,57 50,62Z" fill="#ffcc30"><animateTransform attributeName="transform" type="scale" values="1,1;.95,1.08;1,1" dur=".7s" repeatCount="indefinite" additive="sum" transformOrigin="50 62"/></path>
          <circle cx="43" cy="50" r="1.5" fill="#ffe060" opacity="0"><animate attributeName="cy" values="88;22" dur="2.2s" repeatCount="indefinite"/><animate attributeName="cx" values="43;39;43" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.9;.9;0" dur="2.2s" repeatCount="indefinite"/></circle>
          <circle cx="57" cy="50" r="1" fill="#ffaa30" opacity="0"><animate attributeName="cy" values="85;18" dur="1.8s" begin=".6s" repeatCount="indefinite"/><animate attributeName="cx" values="57;61;57" dur="1.8s" begin=".6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;.8;0" dur="1.8s" begin=".6s" repeatCount="indefinite"/></circle>
        </svg>`;
      };
      cfWrap.appendChild(cfImg);
      panorama.appendChild(cfWrap);
      makeCampLayerDraggable(cfWrap, 'campfire', panorama, layer.z, layer.width);
    } else {
      const img = el('img', 'camp-layer camp-layer-appear');
      img.loading = 'eager';
      img.src = `assets/rifugio/scene/${layer.id}.png`;
      img.alt = '';
      const sv = HERO.campLayout?.[layer.id];
      const lL = sv ? sv.left   : layer.left;
      const lB = sv ? sv.bottom : layer.bottom;
      const lW = sv ? sv.width  : layer.width;
      img.style.cssText = `left:${lL}%;bottom:${lB}%;width:${lW}%;z-index:${layer.z}`;
      img.onerror = () => img.remove();
      makeCampLayerDraggable(img, layer.id, panorama, layer.z, layer.width);
      panorama.appendChild(img);
    }
  }

  // 6. Cavalcatura — zona dedicata per stage, sempre in primo piano (z:21)
  if (mount) {
    const mountWidths = [11, 14, 16, 18, 20];
    const mountLeft   = [75, 57, 62, 62, 62];
    const mw = mountWidths[stageIdx] ?? 14;
    const ml = mountLeft[stageIdx] ?? 62;
    const mSv = HERO.campLayout?.mount;
    const mL  = mSv ? mSv.left   : ml;
    const mB  = mSv ? mSv.bottom : 5;
    const mW  = mSv ? mSv.width  : mw;
    const mountLayer = el('img', 'camp-layer camp-mount-layer camp-layer-appear');
    mountLayer.loading = 'eager';
    mountLayer.src = mount.img;
    mountLayer.alt = mount.name || '';
    mountLayer.style.cssText = `left:${mL}%;bottom:${mB}%;width:${mW}%;z-index:21`;
    mountLayer.title = mount.name || '';
    mountLayer.onerror = () => {
      mountLayer.remove();
      const mountEmoji = el('div', 'camp-layer camp-mount-emoji');
      mountEmoji.textContent = mount.emoji || '🐴';
      mountEmoji.style.cssText = `left:${mL}%;bottom:${mB}%;width:${Math.round(mW*0.6)}%;z-index:21;font-size:clamp(1.2rem,4vw,2rem);display:flex;align-items:flex-end;justify-content:center`;
      panorama.appendChild(mountEmoji);
    };
    makeCampLayerDraggable(mountLayer, 'mount', panorama, 21, mw);
    panorama.appendChild(mountLayer);
  }

  // 7. Layer notturni (luna + fire_glow) — solo dusk/night
  if (isNightTime) {
    for (const nl of RPG.CAMP_NIGHT_LAYERS) {
      const nImg = el('img', 'camp-layer camp-night-layer camp-layer-appear');
      nImg.loading = 'eager';
      nImg.src = `assets/rifugio/scene/${nl.id}.png`;
      nImg.alt = '';
      nImg.style.cssText = `left:${nl.left}%;bottom:${nl.bottom}%;width:${nl.width}%;z-index:${nl.z}`;
      nImg.onerror = () => nImg.remove();
      panorama.appendChild(nImg);
    }
    // Lucciole CSS (solo notte piena)
    if (phase === 'night') {
      [[22,55],[45,42],[68,60],[35,70],[80,48],[12,65],[58,35]].forEach(([x,y], i) => {
        const ff = el('div', 'camp-firefly');
        ff.style.cssText = `left:${x}%;top:${y}%;--ff-delay:${(i*0.6).toFixed(1)}s;--ff-dx:${(Math.random()*12-6).toFixed(1)}%;--ff-dy:${(Math.random()*8-4).toFixed(1)}%`;
        panorama.appendChild(ff);
      });
    }
  }

  // 8. Famiglio thumbnail (trascinabile come gli altri layer)
  if (HERO.companion && HERO.pet && HERO.pet.hatched) {
    const pSv = HERO.campLayout?.pet;
    const pL  = pSv ? pSv.left   : 2;
    const pB  = pSv ? pSv.bottom : 5;
    const pW  = pSv ? pSv.width  : 16;
    const petLayer = el('img', 'camp-layer camp-pet-layer camp-layer-appear');
    petLayer.loading = 'eager';
    petLayer.src = petImageSrc(HERO.pet);
    petLayer.alt = HERO.pet.name || '';
    petLayer.style.cssText = `left:${pL}%;bottom:${pB}%;width:${pW}%;z-index:18`;
    petLayer.onerror = () => {
      petLayer.remove();
      const petEmoji = el('div', 'camp-layer camp-pet-emoji');
      petEmoji.textContent = petSpeciesInfo ? petSpeciesInfo.icon : '🐺';
      petEmoji.style.cssText = `left:${pL}%;bottom:${pB}%;width:10%;z-index:18;font-size:clamp(1rem,3.5vw,1.8rem);display:flex;align-items:flex-end;justify-content:center`;
      panorama.appendChild(petEmoji);
    };
    makeCampLayerDraggable(petLayer, 'pet', panorama, 18, 16);
    panorama.appendChild(petLayer);
  }

  // 9. Overlay badge: meteo (basso sx) + fase (basso dx)
  const wx = RPG.getDailyWeather();
  const wxBadge = el('div', 'camp-overlay-badge camp-wx-badge');
  wxBadge.innerHTML = `${wx.icon} <span>${wx.label}</span>${wx.xpBonus > 0 ? ` <b class="camp-xp-bonus">+${Math.round(wx.xpBonus*100)}%</b>` : ''}`;
  panorama.appendChild(wxBadge);

  const phaseLabels = { dawn:'🌤️ Alba', day:'☀️ Giorno', dusk:'🟠 Tramonto', night:'🌙 Notte' };
  const phaseBadge = el('div', 'camp-overlay-badge camp-phase-badge');
  phaseBadge.textContent = phaseLabels[phase] || '';
  panorama.appendChild(phaseBadge);

  // 10. Stage label (alto sx)
  const stageBadge = el('div', 'camp-stage-label');
  stageBadge.textContent = `${stageLabel} · Lv.${campLevel}`;
  panorama.appendChild(stageBadge);

  c.appendChild(panorama);

  /* ── Banner onboarding (solo primi passi) ── */
  const obStep = HERO.onboardingStep || 0;
  if (obStep === 1) {
    const ob = el('div', 'panel onboarding-banner');
    ob.innerHTML = `<div class="ob-row"><span class="ob-icon">⚔️</span><div><b>Prima missione!</b><br><span class="small">Vai nella scheda <b>Allenati</b> e registra il tuo primo allenamento. Il tuo eroe ti aspetta.</span></div></div>
      <button class="btn btn-primary ob-btn">Vai ad allenarmi →</button>`;
    ob.querySelector('.ob-btn').addEventListener('click', () => setTab('train'));
    c.appendChild(ob);
  } else if (obStep === 2) {
    const ob = el('div', 'panel onboarding-banner');
    ob.innerHTML = `<div class="ob-row"><span class="ob-icon">⚔️</span><div><b>Sfida l\'Arena!</b><br><span class="small">Hai ${RPG.battlesLeft(HERO)} sfide disponibili oggi. Combatti nella scheda <b>Allenati</b> per guadagnare oro e oggetti rari.</span></div></div>
      <button class="btn ob-btn-dismiss" id="ob-dismiss-2">Capito ✓</button>`;
    ob.querySelector('#ob-dismiss-2').addEventListener('click', () => {
      HERO.onboardingStep = 3; persist(); setTab('camp');
    });
    c.appendChild(ob);
  }

  // Hint drag + reset layout
  const hasCustomLayout = HERO.campLayout && Object.keys(HERO.campLayout).length > 0;
  const layoutBar = el('div', 'camp-layout-bar');
  layoutBar.innerHTML = hasCustomLayout
    ? `<span class="camp-layout-hint">✋ Trascina · 👆 Tocca per ridimensionare</span><button class="btn btn-small camp-layout-reset">↺ Reset</button>`
    : `<span class="camp-layout-hint">✋ Trascina · 👆 Tocca per ridimensionare</span>`;
  const resetBtn = layoutBar.querySelector('.camp-layout-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => { delete HERO.campLayout; persist(); setTab('camp'); });
  c.appendChild(layoutBar);

  // Disegna stelle dopo che il canvas è nel DOM
  requestAnimationFrame(() => drawCampStars(starsCanvas, phase));

  // Stagione corrente — chip in alto a destra nel panorama
  const season = RPG.currentSeason();
  const seasonEl = el('div', 'camp-season-chip');
  seasonEl.innerHTML = `${season.icon} <b>${season.name}</b>`;
  seasonEl.style.setProperty('--season-color', season.color);
  seasonEl.addEventListener('click', () => showSeasonModal());
  panorama.appendChild(seasonEl);


  // Prima missione — visibile solo finché totalKm === 0
  if ((HERO.totalKm || 0) === 0) {
    const fp = el('div', 'panel camp-first-quest');
    fp.innerHTML = `
      <div class="cfq-eyebrow">✦ Prima Missione</div>
      <div class="cfq-title">Muovi il primo passo</div>
      <p class="muted small cfq-text">Il tuo Rifugio prende vita con ogni km che percorri. Registra la tua prima attività e guarda cosa succede.</p>
      <div class="cfq-rewards">
        <span class="cfq-reward">🪙 Oro</span>
        <span class="cfq-reward">⚔️ XP</span>
        <span class="cfq-reward">🎁 Forziere</span>
      </div>`;
    const goBtn = el('button', 'btn btn-primary wide', '⚔️ Vai ad Allenarti');
    goBtn.addEventListener('click', () => setTab('train'));
    fp.appendChild(goBtn);
    c.appendChild(fp);
  }

  // Santuario dei Famigli
  if (HERO.companion && HERO.pet && !HERO.pet.hatched) {
    const egg = RPG.eggProgress(HERO);
    const sp = el('div', 'panel santuario-teaser');
    sp.appendChild(el('h3', 'panel-title', '🥚 Uovo Misterioso'));
    const thumb = el('img', 'pet-thumb' + (egg.ready ? ' egg-shake' : ''));
    thumb.src = petImageSrc(HERO.pet);
    thumb.onerror = () => { thumb.style.display = 'none'; };
    sp.appendChild(thumb);
    sp.appendChild(el('div', 'membar slim', `<div class="membar-fill gold" style="width:${egg.pct}%"></div><span>${egg.km.toFixed(1)} / ${egg.needed} km</span>`));
    sp.appendChild(el('p', 'muted small center',
      egg.ready ? '✨ È pronto per schiudersi!' : 'Si scalda un passo alla volta...'));
    const enterBtn = el('button', 'btn btn-primary wide', egg.ready ? '🥚 Guarda l\'uovo' : 'Osserva l\'uovo');
    enterBtn.addEventListener('click', () => { CAMP_VIEW = 'santuario'; setTab('camp'); });
    sp.appendChild(enterBtn);
    c.appendChild(sp);
  } else if (HERO.companion && HERO.pet) {
    RPG.tickPet(HERO); persist();
    const p = HERO.pet;
    const sp = el('div', 'panel santuario-teaser');
    sp.appendChild(el('h3', 'panel-title', '🐾 Il Santuario dei Famigli'));
    const thumb = el('img', 'pet-thumb');
    thumb.src = petImageSrc(p);
    thumb.onerror = () => { thumb.style.display = 'none'; };
    sp.appendChild(thumb);
    let statusMsg = 'Tutto tranquillo.';
    if (p.sick) statusMsg = '🤒 È malato! Ha bisogno di cure urgenti.';
    else if (p.hunger < 30 || p.mood < 30 || p.hygiene < 30 || p.energy < 30) statusMsg = '⚠️ Ha bisogno di attenzioni!';
    else if (p.wish) statusMsg = '💭 Ha un desiderio da esaudire!';
    sp.appendChild(el('p', 'muted small center', `${esc(p.name)} — Liv. ${p.level}. ${statusMsg}`));
    const enterBtn = el('button', 'btn btn-primary wide', 'Entra nel Santuario');
    enterBtn.addEventListener('click', () => { CAMP_VIEW = 'santuario'; setTab('camp'); });
    sp.appendChild(enterBtn);
    c.appendChild(sp);
  } else {
    // Teaser bloccato — visibile finché il Santuario non è sbloccato
    const sanctEntry = el('div', 'panel santuario-entry-panel');
    const sanctThumb = document.createElement('img');
    sanctThumb.src = 'assets/ui/santuario-famigli.jpg';
    sanctThumb.alt = '';
    sanctThumb.className = 'camp-panel-thumb santuario-thumb';
    sanctThumb.onerror = () => sanctThumb.remove();
    sanctEntry.appendChild(sanctThumb);
    const sanctHead = el('div', 'santuario-entry-head');
    sanctHead.appendChild(el('h3', 'panel-title santuario-entry-title', '🥚 Il Santuario dei Famigli'));
    sanctHead.appendChild(el('span', 'santuario-lock-badge', '🔒'));
    sanctEntry.appendChild(sanctHead);
    sanctEntry.appendChild(el('p', 'muted small santuario-teaser-quote',
      '«Nelle profondità della Foresta Sussurrante, qualcosa di antico attende di schiudersi. Una missione specifica ti condurrà a lui — se sarai pronto.»'));
    const lockedBtn = el('button', 'btn btn-primary wide santuario-locked-btn', '🔒 Ancora sigillato');
    lockedBtn.disabled = true;
    sanctEntry.appendChild(lockedBtn);
    c.appendChild(sanctEntry);
  }

  // ── Il Cantiere dell'Eroe (Edifici + Arredamento) ──
  {
    const totalOwned      = (HERO.furniture && HERO.furniture.owned.length) || 0;
    const setsComplete    = RPG.FURNITURE_SETS.filter(s => RPG.furnitureSetComplete(HERO, s.id)).length;
    const layersOwned     = RPG.CAMP_LAYER_SHOP.filter(l => (HERO.furniture && HERO.furniture.owned || []).includes(l.id)).length;
    const cp = el('div', 'panel cantiere-panel');

    // Header immagine
    const cantThumb = el('img', 'camp-panel-thumb');
    cantThumb.src = 'assets/ui/rifugio/cantiere-eroe.jpg';
    cantThumb.alt = '';
    cp.appendChild(cantThumb);

    cp.appendChild(el('h3', 'panel-title', '🏗️ Il Cantiere dell\'Eroe'));
    cp.appendChild(el('p', 'muted small', 'Costruisci edifici e arreda la tua dimora per sbloccare bonus permanenti.'));

    // ── Sezione Strutture dell'Accampamento ──
    cp.appendChild(el('h4', 'cantiere-section-title', '🏗️ Strutture dell\'Accampamento'));
    cp.appendChild(el('p', 'muted small',
      `${layersOwned} / 25 strutture costruite — appaiono nel tuo accampamento.`));
    const enterStruttureBtn = el('button', 'btn btn-primary wide', '🏗️ Costruisci Strutture');
    enterStruttureBtn.addEventListener('click', () => { CAMP_VIEW = 'strutture'; setTab('camp'); });
    cp.appendChild(enterStruttureBtn);

    // ── Sezione Arredamento ──
    cp.appendChild(el('h4', 'cantiere-section-title', '🏛️ Arredamento'));
    cp.appendChild(el('p', 'muted small',
      `${totalOwned} / 200 cimeli raccolti · ${setsComplete} / 20 set completi.`));
    const enterArredaBtn = el('button', 'btn btn-primary wide', '🏛️ Entra nella Bottega');
    enterArredaBtn.addEventListener('click', () => { CAMP_VIEW = 'arredamento'; setTab('camp'); });
    cp.appendChild(enterArredaBtn);

    c.appendChild(cp);
  }

  // Serra del Viandante
  {
    const growingCount = HERO.greenhouse.pots.filter(p => p.status === 'growing' || p.status === 'ready').length;
    const readyCount   = HERO.greenhouse.pots.filter(p => p.status === 'ready').length;
    const dangerCount  = HERO.greenhouse.pots.filter(p => p.status === 'growing' && p.health < 40).length;
    const gp = el('div', readyCount ? 'panel panel-featured' : 'panel');
    const serraThumb = el('img', 'camp-panel-thumb');
    serraThumb.src = 'assets/minigames/serra/SERRA.jpg';
    serraThumb.alt = '';
    gp.appendChild(serraThumb);
    gp.appendChild(el('h3', 'panel-title', '🌿 La Serra del Viandante'));
    if (dangerCount) gp.appendChild(el('p', 'serra-danger-warn', `⚠️ ${dangerCount} pianta${dangerCount > 1 ? 'e in pericolo' : ' in pericolo'}! Annaffia subito.`));
    gp.appendChild(el('p', 'muted small',
      readyCount
        ? `🎁 ${readyCount} pianta${readyCount > 1 ? 'e' : ''} pronta${readyCount > 1 ? '' : 'e'} per il raccolto!`
        : growingCount
          ? `${growingCount} pianta${growingCount > 1 ? 'e' : ''} in crescita. Annaffiale con il tuo sudore.`
          : 'Coltiva piante magiche annaffiandole con i km percorsi. La costanza porta frutti leggendari.'));
    if (readyCount) gp.appendChild(el('span', 'mg-card-badge', String(readyCount)));
    const enterGreenhouseBtn = el('button', 'btn btn-primary wide', '🌿 Entra nella Serra');
    enterGreenhouseBtn.addEventListener('click', () => { CAMP_VIEW = 'serra'; setTab('camp'); });
    gp.appendChild(enterGreenhouseBtn);
    c.appendChild(gp);
  }

  // Visita alleato
  const others = STATE.heroes.filter(h => h.id !== HERO.id);
  if (others.length) {
    const vp = el('div', 'panel');
    const vTitle = el('h3', 'panel-title', '🪞 Visita il Rifugio del tuo Alleato');
    vp.appendChild(vTitle);
    const trofeoImg = new Image();
    trofeoImg.onload = () => { vTitle.innerHTML = `<img class="panel-title-icon" src="assets/ui/rifugio/trofeo-alleato.png"> Visita il Rifugio del tuo Alleato`; };
    trofeoImg.src = 'assets/ui/rifugio/trofeo-alleato.png';
    others.forEach(o => {
      const btn = el('button', 'btn wide', `Guarda la base di ${esc(o.name)}`);
      btn.addEventListener('click', () => showAllyBase(o));
      vp.appendChild(btn);
    });
    c.appendChild(vp);
  }

  // Riposo
  const rp = el('div', HERO.restBonus ? 'panel panel-featured' : 'panel');
  rp.appendChild(el('h3', 'panel-title', '😴 Falò Rigenerante'));
  rp.appendChild(el('p', 'muted small',
    'Dichiara un Giorno di Riposo (max 2 a settimana): il prossimo allenamento varrà il DOPPIO.' +
    (HERO.restBonus ? '<br><b>✨ Bonus Riposo attivo: il prossimo allenamento vale x2!</b>' : '')));
  const rbtn = el('button', 'btn btn-primary wide', 'Riposa oggi');
  rbtn.addEventListener('click', () => {
    const err = RPG.declareRestDay(HERO);
    persist();
    toast(err || '😴 Riposo dichiarato! Domani il tuo allenamento varrà x2.');
    setTab('camp');
  });
  rp.appendChild(rbtn);
  c.appendChild(rp);
}

function showAllyBase(o) {
  RPG.migrateHero(o);
  const mount = o.mount ? RPG.mountById(o.mount) : null;
  modal(`
    <h3 class="panel-title">🪞 Il Rifugio di ${esc(o.name)}</h3>
    <div class="camp-emoji">🔥${o.companion ? ' 🐺' : ''}${mount ? ' ' + mount.emoji : ''}</div>
    <p class="muted">Liv. ${o.level} — ${RPG.heroTitle(o.level)} · ${o.totalKm.toFixed(1)} km totali</p>
    ${mount ? `<p>Cavalcatura: ${mount.emoji} ${mount.name}</p>` : ''}
    <p class="muted small">${o.cards.length} carte · ${(o.bestiary || []).length} creature nel Bestiario · ${(o.items || []).length} oggetti</p>
    <button class="btn btn-primary wide" onclick="closeModal()">Torna al tuo Rifugio</button>
  `);
}

function petImageSrc(pet) {
  const stage = RPG.petStage(pet.level);
  return `assets/pet/${pet.species}/${stage}.png`;
}

function renderEggView(c) {
  const pet = HERO.pet;
  const speciesInfo = RPG.PET_SPECIES[pet.species];
  const egg = RPG.eggProgress(HERO);

  const backBtn = el('button', 'btn btn-small', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  c.appendChild(el('h2', 'section-title', '🥚 Uovo Misterioso'));

  const head = el('div', 'panel center');
  const img = el('img', 'pet-portrait-img' + (egg.ready ? ' egg-shake' : ''));
  img.loading = 'eager';
  img.src = petImageSrc(pet);
  img.onerror = () => { img.outerHTML = `<div class="pet-portrait">🥚</div>`; };
  head.appendChild(img);
  head.appendChild(el('h3', 'hero-name-plate center', `Uovo di ${esc(speciesInfo.name)}`));
  head.appendChild(el('p', 'small muted center',
    'Finché l\'uovo non si schiude non ha bisogno di nulla: si scalda un passo alla volta con i chilometri che percorri. Il mistero si svelerà alla schiusa.'));
  c.appendChild(head);

  const progPanel = el('div', 'panel');
  progPanel.appendChild(el('h3', 'panel-title', '🔥 Incubazione'));
  progPanel.appendChild(el('div', 'membar', `<div class="membar-fill gold" style="width:${egg.pct}%"></div><span>${egg.km.toFixed(1)} / ${egg.needed} km</span>`));
  c.appendChild(progPanel);

  if (egg.ready) {
    const hatchPanel = el('div', 'panel incursion-panel center');
    hatchPanel.appendChild(el('p', 'center big-news', '✨ L\'uovo trema... è pronto!'));
    const hatchBtn = el('button', 'btn btn-primary wide big', '🥚 Tocca per rompere il guscio!');
    hatchBtn.addEventListener('click', () => playHatchSequence(pet));
    hatchPanel.appendChild(hatchBtn);
    c.appendChild(hatchPanel);
  } else {
    c.appendChild(el('p', 'muted small center', 'Continua ad allenarti: ogni chilometro scalda l\'uovo un po\' di più.'));
  }
}

function playHatchSequence(pet) {
  const videoSrc = `assets/pet/${pet.species}/hatch.mp4`;
  const overlay = el('div', 'hatch-overlay');
  overlay.innerHTML = `
    <video class="hatch-video" autoplay playsinline muted></video>
    <button class="btn wide hatch-skip">Salta ➜</button>`;
  document.body.appendChild(overlay);
  const video = overlay.querySelector('video');
  const finish = () => {
    overlay.remove();
    const r = RPG.hatchPet(HERO);
    persist(); renderHUD();
    if (r && r.ok) { toast(`🎉 ${esc(HERO.pet.name)} è nato!`); sfx('level'); vibrate([80, 40, 80, 40, 120]); }
    else toast(r);
    setTab('camp');
  };
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  overlay.querySelector('.hatch-skip').addEventListener('click', finish);
  video.src = videoSrc;
  video.play().catch(() => finish());
}

function renderSantuarioView(c) {
  const pet = HERO.pet;
  if (!pet.hatched) { renderEggView(c); return; }
  RPG.tickPet(HERO); persist();
  const pers = RPG.PET_PERSONALITIES[pet.personality];

  const backBtn = el('button', 'btn btn-small', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  c.appendChild(el('h2', 'section-title', '🐾 Il Santuario dei Famigli'));

  const speciesInfo = RPG.PET_SPECIES[pet.species];
  const stage = RPG.petStage(pet.level);
  const head = el('div', 'panel center');
  const portraitWrap = el('div', 'pet-portrait-wrap');
  const img = el('img', 'pet-portrait-img');
  img.loading = 'eager';
  img.src = petImageSrc(pet);
  img.onerror = () => { img.outerHTML = `<div class="pet-portrait">${speciesInfo.icon}</div>`; };
  portraitWrap.appendChild(img);
  if (pet.accessory) portraitWrap.appendChild(el('div', 'pet-accessory-badge', RPG.PET_ACCESSORIES[pet.accessory].icon));
  head.appendChild(portraitWrap);
  head.appendChild(el('div', 'pet-stage-tag small', `${speciesInfo.icon} ${speciesInfo.name} · Stadio ${stage}/5`));

  // Nome + tasto rinomina
  const nameRow = el('div', 'pet-name-row');
  nameRow.appendChild(el('h3', 'hero-name-plate center', `${esc(pet.name)} — Liv. ${pet.level}`));
  const renameBtn = el('button', 'btn btn-small pet-rename-btn', '✏️');
  renameBtn.title = 'Rinomina';
  renameBtn.addEventListener('click', () => {
    const newName = prompt(`Nuovo nome per ${pet.name}:`, pet.name);
    if (newName && newName.trim()) {
      pet.name = newName.trim().slice(0, 20);
      persist();
      setTab('camp');
    }
  });
  nameRow.appendChild(renameBtn);
  head.appendChild(nameRow);

  // Barra XP
  const xpNeeded = RPG.petXpForLevel(pet.level);
  const xpPct = Math.round((pet.xp / xpNeeded) * 100);
  const xpWrap = el('div', 'pet-xp-wrap');
  xpWrap.innerHTML = `<div class="pet-xp-label small muted">XP ${pet.xp}/${xpNeeded}</div>
    <div class="membar slim"><div class="membar-fill gold" style="width:${xpPct}%"></div></div>`;
  head.appendChild(xpWrap);

  head.appendChild(el('p', 'small muted', `${pers.icon} <b>${pers.name}</b><br>${pers.desc}`));
  if (pet.restedBonusActive) head.appendChild(el('div', 'pet-rested-badge', '😴 Riposato! XP +20% oggi'));
  c.appendChild(head);

  if (RPG.packAuraActive(STATE, HERO)) {
    c.appendChild(el('div', 'panel done-strip', '🌟 <b>Aura del Branco attiva!</b> Entrambi i famigli sono felici: sconto e bonus drop condivisi!'));
  }

  if (pet.sick) {
    const sickP = el('div', 'panel incursion-panel');
    sickP.innerHTML = `<h3 class="panel-title">🤒 ${esc(pet.name)} è malato!</h3>
      <p class="small muted center">Solo la Pozione della Fenice può guarirlo.</p>`;
    const cureBtn = el('button', 'btn btn-primary wide', `🧪 Cura (${RPG.PHOENIX_POTION_PRICE} 🪙)`);
    cureBtn.addEventListener('click', () => {
      const r = RPG.curePet(HERO);
      persist();
      if (r && r.ok) { toast('✨ Guarito! Il tuo famiglio sta di nuovo bene.'); sfx('level'); }
      else toast(r);
      renderHUD(); setTab('camp');
    });
    sickP.appendChild(cureBtn);
    c.appendChild(sickP);
  }

  if (pet.wish) {
    const food = RPG.PET_FOODS[pet.wish.item];
    const minLeft = Math.max(0, Math.ceil((pet.wish.deadline - Date.now()) / 60000));
    const wp = el('div', 'panel incursion-panel');
    wp.innerHTML = `<h3 class="panel-title">💭 Desiderio improvviso!</h3>
      <p class="center">${esc(pet.name)} desidera: <b>${food.icon} ${food.name}</b></p>
      <p class="muted small center">Scade tra ${minLeft} min!</p>`;
    const giveBtn = el('button', 'btn btn-primary wide', `Dai ${food.icon} ${food.name}`);
    giveBtn.addEventListener('click', () => {
      const r = RPG.feedPet(HERO, pet.wish.item);
      persist();
      if (r && r.ok) { toast(r.wishFulfilled ? '🎉 Desiderio esaudito!' : `${food.icon} sfamato!`); sfx('coin'); }
      else toast(r);
      renderHUD(); setTab('camp');
    });
    wp.appendChild(giveBtn);
    c.appendChild(wp);
  }

  const statsPanel = el('div', 'panel');
  statsPanel.appendChild(el('h3', 'panel-title', '📊 Bisogni'));
  [
    ['🍖 Sazietà', pet.hunger],
    ['🎾 Umore', pet.mood],
    ['🛁 Igiene', pet.hygiene],
    ['🌙 Energia', pet.energy],
  ].forEach(([label, val]) => {
    const cls = val < 30 ? 'danger' : 'gold';
    statsPanel.innerHTML += `<div class="stat-row">${label} <b>${Math.round(val)}%</b></div>
      <div class="membar slim"><div class="membar-fill ${cls}" style="width:${Math.round(val)}%"></div></div>`;
  });
  c.appendChild(statsPanel);

  const actionsPanel = el('div', 'panel');
  actionsPanel.appendChild(el('h3', 'panel-title', '🤲 Prenditi cura di lui'));
  const grid = el('div', 'hero-submenu');

  const feedBtn = el('button', 'btn submenu-btn');
  feedBtn.innerHTML = `<span class="submenu-emoji">🍖</span><span>Nutri</span>`;
  feedBtn.addEventListener('click', openFeedPicker);
  grid.appendChild(feedBtn);

  const playBtn = el('button', 'btn submenu-btn');
  playBtn.innerHTML = `<span class="submenu-emoji">🎾</span><span>Gioca</span>`;
  playBtn.addEventListener('click', () => {
    const r = RPG.playWithPet(HERO);
    persist();
    if (r && r.ok) { checkPetEvolution(r); toast('🎾 Che divertimento!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(playBtn);

  const cleanBtn = el('button', 'btn submenu-btn');
  cleanBtn.innerHTML = `<span class="submenu-emoji">🛁</span><span>Pulisci</span>`;
  cleanBtn.addEventListener('click', () => {
    const r = RPG.cleanPet(HERO);
    persist();
    if (r && r.ok) { checkPetEvolution(r); toast('🛁 Pulito e profumato!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(cleanBtn);

  const sleepBtn = el('button', 'btn submenu-btn');
  sleepBtn.innerHTML = `<span class="submenu-emoji">🌙</span><span>Nanna</span>`;
  sleepBtn.addEventListener('click', () => {
    const r = RPG.sleepPet(HERO);
    persist();
    if (r && r.ok) { toast('🌙 Dorme sereno... energia piena domani!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(sleepBtn);

  actionsPanel.appendChild(grid);
  c.appendChild(actionsPanel);

  const expStatus = RPG.expeditionStatus(HERO);
  const expPanel = el('div', 'panel');
  expPanel.appendChild(el('h3', 'panel-title', '🎒 Spedizione di Foraggiamento'));
  if (!pet.expedition) {
    expPanel.appendChild(el('p', 'muted small', `Invia ${esc(pet.name)} in esplorazione per ${RPG.EXPEDITION_HOURS} ore. Più km percorri nel frattempo, più ricco sarà il bottino al ritorno!`));
    const startBtn = el('button', 'btn btn-primary wide', '🚀 Invia in spedizione');
    startBtn.disabled = !!pet.sick;
    startBtn.addEventListener('click', () => {
      const r = RPG.startExpedition(HERO);
      persist();
      if (r && r.ok) toast('🎒 Spedizione iniziata!'); else toast(r);
      setTab('camp');
    });
    expPanel.appendChild(startBtn);
  } else if (expStatus.ready) {
    expPanel.appendChild(el('p', 'center', '📦 Il bottino è pronto!'));
    const collectBtn = el('button', 'btn btn-primary wide', 'Riscuoti');
    collectBtn.addEventListener('click', () => {
      const r = RPG.collectExpedition(HERO);
      persist();
      if (r) {
        toast(r.epic ? `🌟 Bottino epico! 🪙${r.gold} 🪵${r.wood} 🪨${r.stone}` : `🎒 Bottino: 🪵${r.wood} 🪨${r.stone}`);
        sfx('chest');
      }
      renderHUD(); setTab('camp');
    });
    expPanel.appendChild(collectBtn);
  } else {
    expPanel.appendChild(el('div', 'membar slim', `<div class="membar-fill gold" style="width:${expStatus.pctDone}%"></div><span>${expStatus.pctDone}%</span>`));
    expPanel.appendChild(el('p', 'muted small center', 'In esplorazione... torna più tardi!'));
  }
  c.appendChild(expPanel);

  const shop = el('div', 'panel');
  shop.appendChild(el('h3', 'panel-title', '🛍️ Bottega degli Accessori'));
  const shopGrid = el('div', 'loot-list');
  Object.entries(RPG.PET_ACCESSORIES).forEach(([key, acc]) => {
    const owned = pet.accessoriesOwned.includes(key);
    const equipped = pet.accessory === key;
    const row = el('div', 'loot pickable' + (equipped ? ' equipped' : ''));
    row.innerHTML = `<div class="loot-body"><div class="loot-head"><b>${acc.icon} ${acc.name}</b>${equipped ? ' ✅' : ''}</div>
      <div class="small">${owned ? (equipped ? 'Equipaggiato' : 'Posseduto — tocca per indossare') : `🪙 ${acc.price}`}</div></div>`;
    row.addEventListener('click', () => {
      const r = RPG.buyAccessory(HERO, key);
      persist();
      if (r && r.ok) { toast(equipped ? 'Rimosso' : `${acc.icon} Equipaggiato!`); renderHUD(); }
      else toast(r);
      setTab('camp');
    });
    shopGrid.appendChild(row);
  });
  shop.appendChild(shopGrid);
  c.appendChild(shop);
}

function checkPetEvolution(r) {
  if (r && r.evolved) {
    sfx('level');
    vibrate([100, 50, 100, 50, 200]);
    toast(`✨ ${esc(HERO.pet.name)} è evoluto! Stadio ${r.stage}/5 raggiunto!`);
  }
}

function checkPetNotify() {
  if (Notification.permission !== 'granted' || !HERO || !HERO.pet || !HERO.pet.hatched) return;
  RPG.tickPet(HERO);
  const p = HERO.pet;
  const today = todayISO();
  if (p.hunger < 30) {
    showNotif(`🍖 ${esc(p.name)} ha fame!`, 'Il tuo famiglio è quasi affamato — nutrilo subito!', 'pet_hunger_' + today);
  }
  if (p.mood < 30) {
    showNotif(`🎾 ${esc(p.name)} è triste!`, 'Il suo umore è al minimo — giocaci un po\'!', 'pet_mood_' + today);
  }
}

function openFeedPicker() {
  let html = `<h3 class="panel-title">🍖 Scegli il pasto</h3><div class="loot-list" id="feed-picker-list"></div>
    <button class="btn wide" onclick="closeModal()">Annulla</button>`;
  modal(html);
  const list = $('#feed-picker-list');
  Object.entries(RPG.PET_FOODS).forEach(([key, food]) => {
    const row = el('div', 'loot pickable');
    row.innerHTML = `<div class="loot-body"><div class="loot-head"><b>${food.icon} ${food.name}</b></div>
      <div class="small">Sazietà +${food.restoreHunger} · 🪙 ${food.price}</div></div>`;
    row.addEventListener('click', () => {
      const r = RPG.feedPet(HERO, key);
      persist();
      closeModal();
      if (r && r.ok) { toast(r.wishFulfilled ? '🎉 Desiderio esaudito!' : `${food.icon} Nutrito!`); sfx('coin'); renderHUD(); }
      else toast(r);
      setTab('camp');
    });
    list.appendChild(row);
  });
}

function renderStruttureView(c) {
  const backBtn = el('button', 'btn btn-small', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  const headerPanel = el('div', 'panel');
  const thumb = el('img', 'camp-panel-thumb');
  thumb.src = 'assets/ui/rifugio/cantiere-eroe.jpg';
  thumb.alt = '';
  headerPanel.appendChild(thumb);
  headerPanel.appendChild(el('h2', 'section-title', '🏗️ Strutture dell\'Accampamento'));
  const ownedIds = (HERO.furniture && HERO.furniture.owned) || [];
  const layersOwned = RPG.CAMP_LAYER_SHOP.filter(l => ownedIds.includes(l.id)).length;
  headerPanel.appendChild(el('p', 'muted small center',
    `${layersOwned} / 25 strutture costruite · appaiono nel panorama del tuo accampamento`));
  c.appendChild(headerPanel);

  const STAGE_NAMES = ['Accampamento', 'Avamposto', 'Rifugio', 'Fortilizio', 'Cittadella'];
  const STAGE_MIN_LEVELS = [0, 10, 20, 30, 40];

  for (let stage = 0; stage <= 4; stage++) {
    const items = RPG.CAMP_LAYER_SHOP.filter(l => l.stage === stage);
    const stageUnlocked = HERO.level >= STAGE_MIN_LEVELS[stage];
    const stageOwned = items.filter(l => ownedIds.includes(l.id)).length;
    const stageComplete = stageOwned === items.length;

    const stagePanel = el('div', 'panel' + (!stageUnlocked ? ' locked' : '') + (stageComplete ? ' complete' : ''));
    stagePanel.innerHTML = `
      <div class="furniture-set-head">
        <div class="furniture-set-icon">${stageUnlocked ? (stageComplete ? '✅' : '🏗️') : '🔒'}</div>
        <div class="furniture-set-mid">
          <b>Stage ${stage}: ${STAGE_NAMES[stage]}</b>
          <div class="small muted">Livello ${STAGE_MIN_LEVELS[stage]}+</div>
          <div class="small">${stageUnlocked ? `${stageOwned} / ${items.length} strutture${stageComplete ? ' — Completato!' : ''}` : `Sbloccato al Livello ${STAGE_MIN_LEVELS[stage]}`}</div>
        </div>
      </div>`;
    if (stageUnlocked) {
      stagePanel.classList.add('pickable');
      stagePanel.addEventListener('click', () => openStruttureStageModal(stage));
    }
    c.appendChild(stagePanel);
  }
}

function openStruttureStageModal(stage) {
  const STAGE_NAMES = ['Accampamento', 'Avamposto', 'Rifugio', 'Fortilizio', 'Cittadella'];
  const items = RPG.CAMP_LAYER_SHOP.filter(l => l.stage === stage);
  const ownedIds = (HERO.furniture && HERO.furniture.owned) || [];
  const owned = items.filter(l => ownedIds.includes(l.id)).length;

  let html = `<h3 class="panel-title">🏗️ Stage ${stage}: ${STAGE_NAMES[stage]}</h3>
    <p class="small muted center">${owned}/${items.length} strutture costruite</p>
    <div class="loot-list" id="strutture-item-list"></div>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);

  const list = $('#strutture-item-list');
  items.forEach(it => {
    const has = ownedIds.includes(it.id);
    const locked = HERO.level < it.minLevel;
    const row = el('div', 'loot loot-with-img furniture-item-row' + (has ? ' equipped' : '') + (locked ? ' locked' : ''));
    const imgSrc = `assets/rifugio/scene/${it.id}.png`;
    row.innerHTML = `
      <img class="item-icon-big" src="${imgSrc}" onerror="this.outerHTML='<span class=\\"item-icon-big\\">${it.icon}</span>'">
      <div class="loot-body">
        <div class="loot-head"><b>${esc(it.name)}</b>${has ? ' ✅' : ''}</div>
        <div class="small muted">Livello ${it.minLevel}+</div>
        <div class="small">${
          has ? 'Costruita' :
          locked ? `🔒 Richiede Livello ${it.minLevel}` :
          `🪵 ${it.price.wood} · 🪨 ${it.price.stone}`
        }</div>
      </div>`;
    if (!has && !locked) {
      const hasFreeLayer = HERO.consumableBuffs && HERO.consumableBuffs.freeLayer;
      if (hasFreeLayer) {
        const freeTag = el('span', 'free-layer-tag', '🏰 GRATIS (Progetto)');
        row.querySelector('.loot-body').appendChild(freeTag);
      }
      row.classList.add('pickable');
      row.addEventListener('click', () => {
        if (hasFreeLayer) {
          /* bypass costo: aggiungi direttamente e consuma il buff */
          HERO.consumableBuffs.freeLayer = false;
          if (!HERO.furniture) HERO.furniture = { owned: [] };
          HERO.furniture.owned.push(it.id);
          persist(); renderHUD(); sfx('coin');
          toast(`🏰 ${it.name} costruita gratis grazie al Progetto del Castello!`);
          closeModal(); openStruttureStageModal(stage);
          return;
        }
        const r = RPG.buyCampLayer(HERO, it.id);
        persist();
        if (r && r.ok) {
          toast(`${it.icon} ${it.name} costruita!`);
          sfx('coin'); renderHUD(); closeModal(); openStruttureStageModal(stage);
        } else {
          toast(r);
        }
      });
    }
    list.appendChild(row);
  });
}

function renderArredamentoView(c) {
  const backBtn = el('button', 'btn btn-small', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  const headerPanel = el('div', 'panel');
  const thumb = el('img', 'camp-panel-thumb');
  thumb.src = 'assets/ui/rifugio/bottega-arredamento.jpg';
  thumb.alt = '';
  headerPanel.appendChild(thumb);
  headerPanel.appendChild(el('h2', 'section-title', '🏛️ Bottega dell\'Arredamento'));
  const totalOwned = (HERO.furniture && HERO.furniture.owned.length) || 0;
  headerPanel.appendChild(el('p', 'muted small center', `${totalOwned} / 200 cimeli raccolti in tutto il regno`));
  c.appendChild(headerPanel);

  RPG.FURNITURE_SETS.slice()
    .sort((a, b) => RPG.BIOMES[a.biomeIdx].min - RPG.BIOMES[b.biomeIdx].min)
    .forEach(s => {
    const biome = RPG.BIOMES[s.biomeIdx];
    const unlocked = HERO.level >= biome.min;
    const owned = RPG.furnitureSetOwnedCount(HERO, s.id);
    const complete = owned === 10;
    const row = el('div', 'panel furniture-set-row' + (complete ? ' complete' : '') + (!unlocked ? ' locked' : ''));
    const thumbSrc = s.items.find(it => it.img)?.img;
    const thumbHtml = (!unlocked)
      ? `<div class="furniture-set-icon locked-icon">🔒</div>`
      : (thumbSrc
        ? `<img class="furniture-set-icon" src="${thumbSrc}" onerror="this.outerHTML='<div class=&quot;furniture-set-icon&quot;>${s.fallbackIcon}</div>'">`
        : `<div class="furniture-set-icon">${s.fallbackIcon}</div>`);
    row.innerHTML = `
      <div class="furniture-set-head">
        ${thumbHtml}
        <div class="furniture-set-mid">
          <b>${esc(s.name)}</b>
          <div class="small muted">${esc(biome.name)} · Liv. ${biome.min}+</div>
          ${unlocked
            ? `<div class="small">${owned} / 10 pezzi${complete ? ' ✅ <b>Set completo!</b>' : ''}</div>`
            : `<div class="small muted">Sbloccato al Livello ${biome.min}</div>`}
        </div>
      </div>
      <div class="small ${complete ? 'set-bonus-active' : 'muted'}">🎁 Bonus Set: ${esc(s.setBonusDesc)}</div>`;
    if (unlocked) {
      row.classList.add('pickable');
      row.addEventListener('click', () => openFurnitureSetModal(s.id));
    }
    c.appendChild(row);
  });
}

function openFurnitureSetModal(setId) {
  const s = RPG.furnitureSetById(setId);
  const biome = RPG.BIOMES[s.biomeIdx];
  const owned = RPG.furnitureSetOwnedCount(HERO, s.id);
  const complete = owned === 10;
  let html = `<h3 class="panel-title">${s.fallbackIcon} ${esc(s.name)}</h3>
    <p class="small muted center">${esc(biome.name)} · ${owned}/10 pezzi</p>
    <p class="small center ${complete ? 'set-bonus-active' : ''}">🎁 Bonus Set: ${esc(s.setBonusDesc)}${complete ? ' — ATTIVO!' : ''}</p>
    <div class="loot-list" id="furniture-item-list"></div>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
  const list = $('#furniture-item-list');
  const ownedIds = (HERO.furniture && HERO.furniture.owned) || [];
  s.items.forEach(it => {
    const has = ownedIds.includes(it.id);
    const row = el('div', 'loot loot-with-img furniture-item-row' + (has ? ' equipped' : '') + (it.epic ? ' rar-leggendario' : ''));
    const imgHtml = it.img
      ? `<img class="item-icon-big" src="${it.img}" onerror="this.style.visibility='hidden'">`
      : `<span class="item-icon-big furniture-fallback-icon">${s.fallbackIcon}</span>`;
    row.innerHTML = `${imgHtml}<div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b>${it.epic ? ' <span class="tag">EPICO</span>' : ''}${has ? ' ✅' : ''}</div>
      <div class="small muted">${esc(it.bonusText)}</div>
      <div class="small">${has ? 'Posseduto' : `🪙 ${it.price.gold} · 🪵 ${it.price.wood} · 🪨 ${it.price.stone}`}</div>
    </div>`;
    if (!has) {
      row.classList.add('pickable');
      row.addEventListener('click', () => {
        const r = RPG.buyFurniture(HERO, setId, it.id);
        persist();
        if (r && r.ok) {
          toast(r.setComplete ? `🎉 ${it.name} acquisito — SET COMPLETO! Bonus attivo!` : `${it.name} acquisito!`);
          sfx('coin');
          renderHUD();
          closeModal();
          openFurnitureSetModal(setId);
        } else {
          toast(r);
        }
      });
    }
    list.appendChild(row);
  });
}

/* ── TAB: Mappa ── */
function renderMap(c) {
  if (MAP_VIEW === 'atlas')      { renderAtlasView(c);      return; }
  if (MAP_VIEW === 'pantheon')   { renderPantheonView(c);   return; }
  if (MAP_VIEW === 'avamposto')  { renderAvampostoView(c);  return; }
  const biome = RPG.currentBiome(HERO.level);

  // ── Il bioma attuale, con progresso verso il prossimo ──
  const span = biome.max - biome.min + 1;
  const pctBiome = Math.min(100, Math.round((HERO.level - biome.min + 1) / span * 100));
  const hdr = el('div', 'biome-hero');
  hdr.innerHTML = `
    <div class="biome-hero-name">${biome.name}</div>
    <div class="biome-hero-lv small">Livelli ${biome.min}–${biome.max}</div>
    <div class="membar slim"><div class="membar-fill gold" style="width:${pctBiome}%"></div><span>Liv. ${HERO.level}</span></div>`;
  const slug = RPG.biomeSlug(biome);
  if (slug) {
    const bg = new Image();
    bg.onload = () => { hdr.style.backgroundImage = `linear-gradient(180deg, rgba(28,18,9,.25), rgba(28,18,9,.85)), url('assets/biomi/${slug}.jpg')`; hdr.classList.add('has-diorama'); };
    bg.src = `assets/biomi/${slug}.jpg`;
  }
  c.appendChild(hdr);

  // ── Incursione del giorno ──
  if (HERO.incursion && !HERO.incursion.done) {
    const inc = HERO.incursion;
    const p = el('div', 'panel panel-featured incursion-panel');
    p.appendChild(el('h3', 'panel-title', `⚡ INCURSIONE — solo oggi!`));
    if (inc.enemy !== 'cavaliere-drago') {
      const img = el('img', 'incursion-img');
      img.src = `assets/bestiario/${inc.enemy}.png`;
      p.appendChild(img);
    }
    p.appendChild(el('p', 'center', `<b>${esc(inc.name)}</b>`));
    const pct = Math.min(100, Math.round(inc.progressKm / inc.km * 100));
    p.appendChild(el('div', 'membar', `<div class="membar-fill danger" style="width:${pct}%"></div><span>${inc.progressKm.toFixed(1)} / ${inc.km} km</span>`));
    p.appendChild(el('p', 'muted small center',
      `Forziere con oggetto ${RPG.RARITIES[inc.minRarity].label} o superiore.<br>` +
      `<b class="cd-hot"><span data-cd="midnight">…</span> alla scadenza!</b>`));
    c.appendChild(p);
  } else if (HERO.incursion && HERO.incursion.done) {
    c.appendChild(el('div', 'panel done-strip', `✅ <b>Incursione di oggi respinta!</b> <span class="small muted">Torna domani.</span>`));
  }

  // ── Boss settimanale ──
  const bossStatus = RPG.weeklyBossStatus(HERO);
  if (bossStatus) {
    const { boss, progressKm, done, claimed } = bossStatus;
    const pct = Math.min(100, Math.round(progressKm / boss.km * 100));
    const bp = el('div', 'panel panel-featured boss-weekly-panel');
    bp.appendChild(el('h3', 'panel-title', `${boss.icon} Boss Settimanale`));
    bp.appendChild(el('p', 'center', `<b>${esc(boss.name)}</b> — <span class="muted small">${boss.zone}</span>`));
    bp.appendChild(el('div', 'membar', `<div class="membar-fill${claimed ? '' : done ? ' gold' : ' danger'}" style="width:${pct}%"></div><span>${progressKm.toFixed(1)} / ${boss.km} km</span>`));
    if (claimed) {
      bp.appendChild(el('div', 'done-strip', `✅ <b>Boss sconfitto questa settimana!</b>`));
    } else if (done) {
      const claimBtn = el('button', 'btn btn-primary wide', `${boss.icon} Riscuoti bottino · 🪙 ${boss.gold}`);
      claimBtn.addEventListener('click', () => {
        const reward = RPG.claimWeeklyBoss(HERO);
        if (!reward) return;
        persist(); renderHUD();
        vibrate([150, 50, 200]);
        const itemEl = reward.item ? `<div class="loot-list" style="margin:.5rem 0">${itemHtml(reward.item)}</div>` : '';
        const consEl = reward.consumable ? `<p class="center small">💰 ${esc(reward.consumable.icon)} <b>${esc(reward.consumable.name)}</b> nella Sacca!</p>` : '';
        modal(`<h3 class="center">${boss.icon} ${esc(boss.name)} sconfitto!</h3>
          <p class="center">🪙 +${reward.gold} oro${itemEl}</p>
          ${consEl}
          <button class="btn btn-primary wide" onclick="closeModal();setTab('camp')">Ottimo!</button>`);
      });
      bp.appendChild(claimBtn);
    } else {
      bp.appendChild(el('p', 'muted small center', `Sconfiggilo entro domenica · mancano ${(boss.km - progressKm).toFixed(1)} km`));
    }
    c.appendChild(bp);
  }

  // ── Mappa del Tesoro settimanale ──
  const tmStatus = RPG.treasureMapStatus(HERO);
  if (tmStatus) {
    const { progressKm, claimed } = tmStatus;
    const allClaimed = claimed.length >= RPG.TREASURE_MAP_TIERS.length;
    const TIERS = RPG.TREASURE_MAP_TIERS;
    const WP_IMGS = ['assets/map/waypoint-1.png', 'assets/map/waypoint-2.png', 'assets/map/waypoint-3.png'];

    const tp = el('div', 'panel treasure-map-panel');
    tp.appendChild(el('h3', 'panel-title', '🗺️ Mappa del Tesoro'));

    // ── riga track: medal – segmento – medal – segmento – medal ──
    const track = el('div', 'tm-track');

    TIERS.forEach((tier, i) => {
      const done = progressKm >= tier.km;
      const isClaimed = claimed.includes(i);

      // medaglione con wrapper (badge fuori da overflow:hidden)
      const wrap = el('div', 'tm-medal-wrap');
      const medal = el('div', 'tm-medal ' + (isClaimed ? 'claimed' : done ? 'done' : 'locked'));
      const img = document.createElement('img');
      img.src = WP_IMGS[i];
      img.alt = '';
      medal.appendChild(img);
      wrap.appendChild(medal);
      if (done || isClaimed) {
        const badge = el('div', 'tm-badge ' + (isClaimed ? 'claimed' : 'ready'));
        badge.textContent = isClaimed ? '✓' : '!';
        wrap.appendChild(badge);
      }
      track.appendChild(wrap);

      // segmento di sentiero tra questo e il prossimo waypoint
      if (i < TIERS.length - 1) {
        const fromKm = tier.km;
        const toKm = TIERS[i + 1].km;
        const seg = el('div', 'tm-segment');
        const sImg = document.createElement('img');
        sImg.src = 'assets/map/sentiero.png';
        sImg.alt = '';
        seg.appendChild(sImg);

        // bandierina di posizione corrente nel segmento attivo
        if (progressKm >= fromKm && progressKm < toKm) {
          const flagPct = (progressKm - fromKm) / (toKm - fromKm) * 100;
          const flag = el('div', 'tm-flag', '🚩');
          flag.style.left = flagPct + '%';
          seg.appendChild(flag);
        }

        track.appendChild(seg);
      }
    });
    tp.appendChild(track);

    // ── riga etichette: allineata ai 3 medaglioni ──
    const labels = el('div', 'tm-labels');
    TIERS.forEach((tier, i) => {
      const done = progressKm >= tier.km;
      const isClaimed = claimed.includes(i);
      const rewardTxt = `🪙${tier.gold}${tier.wood ? ` 🪵${tier.wood}` : ''}${tier.item ? ' + 🎒' : ''}`;

      const lbl = el('div', 'tm-label');
      lbl.appendChild(el('div', 'tm-reward' + (done && !isClaimed ? ' ready' : ''), rewardTxt));

      const action = el('div', 'tm-action');
      if (isClaimed) {
        action.appendChild(el('span', 'tm-claimed-label', 'Riscosso'));
      } else if (done) {
        const hasReveal = HERO.consumableBuffs && HERO.consumableBuffs.chestReveal;
        const btnLabel = hasReveal ? '🕯️ Rivela & Riscuoti' : '🎁 Riscuoti';
        const btn = el('button', 'tm-claim-btn' + (hasReveal ? ' reveal-active' : ''), btnLabel);
        btn.addEventListener('click', () => {
          if (hasReveal) {
            /* mostra preview prima di sbloccare */
            const t = RPG.TREASURE_MAP_TIERS[i];
            HERO.consumableBuffs.chestReveal = false;
            persist();
            const previewHtml = `<h3 class="center">🕯️ Contenuto Forziere</h3>
              <p class="center">🪙 ${t.gold}${t.wood ? ` 🪵 ${t.wood}` : ''}${t.item ? ' + <b>Oggetto</b>' : ''}</p>
              <p class="center small muted">Riscuoti per ottenerlo!</p>
              <button class="btn btn-primary wide" onclick="closeModal()">Riscuoti ora</button>`;
            modal(previewHtml);
            btn.textContent = '🎁 Riscuoti';
            btn.classList.remove('reveal-active');
            return;
          }
          const reward = RPG.claimTreasureTier(HERO, i);
          if (!reward) return;
          persist(); renderHUD();
          vibrate([80, 40, 120]);
          const itemEl = reward.item ? `<div class="loot-list" style="margin:.5rem 0">${itemHtml(reward.item)}</div>` : '';
          const consEl = reward.consumable ? `<p class="center small">💰 ${esc(reward.consumable.icon)} <b>${esc(reward.consumable.name)}</b> aggiunto alla Sacca!</p>` : '';
          modal(`<h3 class="center">🗺️ Tappa ${i + 1} completata!</h3>
            <p class="center">🪙 +${reward.gold}${reward.wood ? ` 🪵 +${reward.wood}` : ''}${itemEl}</p>
            ${consEl}
            <button class="btn btn-primary wide" onclick="closeModal();setTab('camp')">Ottimo!</button>`);
        });
        action.appendChild(btn);
      } else {
        action.appendChild(el('span', 'tm-km-label', tier.km + ' km'));
      }
      lbl.appendChild(action);
      labels.appendChild(lbl);
    });
    tp.appendChild(labels);

    tp.appendChild(el('div', 'tm-progress-label', `${progressKm.toFixed(1)} km percorsi questa settimana`));
    if (allClaimed) tp.appendChild(el('div', 'done-strip', '✅ <b>Mappa completata questa settimana!</b>'));
    c.appendChild(tp);
  }

  // ── Pozione del Giorno ──
  {
    const potion = RPG.getDailyPotion();
    const already = HERO.dailyPotion && HERO.dailyPotion.claimedDate === todayISO();
    const used = already && HERO.dailyPotion.used;

    const pp = el('div', 'potion-day-panel panel');
    pp.appendChild(el('div', 'panel-title', `⚗️ Pozione del Giorno`));
    pp.appendChild(el('div', 'potion-name', `${potion.icon} ${potion.name}`));
    pp.appendChild(el('div', 'potion-desc', potion.desc));

    if (used) {
      pp.appendChild(el('div', 'potion-claimed-note', '✅ Pozione usata oggi'));
    } else if (already) {
      pp.appendChild(el('div', 'potion-claimed-note', `${potion.icon} Riscattata · si attiva al prossimo allenamento`));
    } else {
      const btn = el('button', 'btn btn-primary wide', `${potion.icon} Riscuoti pozione`);
      btn.addEventListener('click', () => {
        const err = RPG.claimDailyPotion(HERO);
        if (err) { toast(err); return; }
        persist(); renderHUD();
        vibrate([60, 30, 100]);
        setTab('camp');
      });
      pp.appendChild(btn);
    }
    c.appendChild(pp);
  }

  // ── Mercante Itinerante (ven–dom) ──
  if (RPG.isMerchantWeekend()) {
    const merchant = RPG.getTravelingMerchant(HERO);
    if (merchant) {
      const mp = el('div', 'panel merchant-panel');
      mp.appendChild(el('h3', 'panel-title', '🛒 Mercante Itinerante'));
      mp.appendChild(el('p', 'muted small center', 'Disponibile solo venerdì–domenica! Sparisce lunedì.'));
      merchant.offers.forEach((o, i) => {
        const boughtKey = merchant.weekStamp + '-' + i;
        const bought = HERO.merchantBought && HERO.merchantBought[boughtKey];
        const effectivePrice = RPG.merchantEffectivePrice(HERO, o.price);
        const hasDiscount = effectivePrice < o.price;
        const row = el('div', 'merchant-offer-row' + (bought ? ' bought' : ''));
        row.innerHTML = `<div class="merchant-offer-info">${itemHtml(o.item)}</div>`;
        if (bought) {
          row.innerHTML += `<span class="done-strip">✅</span>`;
        } else {
          const priceLabel = hasDiscount
            ? `🪙 <s style="opacity:.5">${o.price}</s> ${effectivePrice}`
            : `🪙 ${effectivePrice}`;
          const btn = el('button', 'btn' + (HERO.gold >= effectivePrice ? ' btn-primary' : ''));
          btn.innerHTML = priceLabel;
          btn.addEventListener('click', () => {
            const err = RPG.buyFromMerchant(HERO, i);
            if (err) { toast(err); return; }
            persist(); renderHUD();
            vibrate([80, 40, 120]);
            setTab('camp');
          });
          row.appendChild(btn);
        }
        mp.appendChild(row);
      });
      c.appendChild(mp);
    }
  }

  // ── Avamposto delle Spedizioni (entry) ──
  {
    const avail = RPG.availableMissions(HERO);
    const active = HERO.activeMission ? RPG.MISSIONS.find(x => x.id === HERO.activeMission.id) : null;
    const avamposto = el('div', 'panel avamposto-entry-panel');
    const thumb = document.createElement('img');
    thumb.src = 'assets/ui/avamposto.jpg';
    thumb.alt = '';
    thumb.className = 'camp-panel-thumb';
    avamposto.appendChild(thumb);
    avamposto.appendChild(el('h3', 'panel-title', '🏕️ Avamposto delle Spedizioni'));
    avamposto.appendChild(el('p', 'muted small',
      active
        ? `🐎 In viaggio: ${active.name} — ${HERO.activeMission.progressKm.toFixed(1)} / ${active.km} km`
        : avail.length
          ? `${avail.length} missioni disponibili. Parti e conquista nuovi territori.`
          : 'Nessuna missione disponibile al momento.'));
    const enterBtn = el('button', active ? 'btn btn-primary wide' : 'btn wide', active ? '🐎 Controlla spedizione' : '⚔️ Scegli una missione');
    enterBtn.addEventListener('click', () => { MAP_VIEW = 'avamposto'; setTab('map'); });
    avamposto.appendChild(enterBtn);
    c.appendChild(avamposto);
  }

  // ── Taglia Unica settimanale (compatta) ──
  const ev = RPG.weeklyEvent(STATE);
  const evMsLeft = msToWeekEnd();
  const evUrgent = evMsLeft < 86400000; // meno di 24 ore
  const evp = el('div', 'panel event-panel' + (evUrgent && !ev.claimedBy ? ' event-panel-urgent' : ''));
  if (evUrgent && !ev.claimedBy) {
    const urgLabel = el('div', 'event-urgency-banner');
    urgLabel.innerHTML = `⚠️ SCADE FRA <span data-cd="week">…</span> — MAI PIÙ OTTENIBILE!`;
    evp.appendChild(urgLabel);
  }
  evp.appendChild(el('h3', 'panel-title', `${ev.icon} Taglia: ${ev.name}`));
  if (ev.claimedBy) {
    evp.appendChild(el('p', 'muted small', ev.claimedBy === HERO.name
      ? `🏆 Reclamata da TE! Ricompensa: ${ev.skin}`
      : `⛔ <b>${esc(ev.claimedBy)}</b> è arrivato prima di te questa settimana.`));
  } else {
    const cdClass = evUrgent ? 'cd-critical' : 'cd-hot';
    evp.appendChild(el('p', 'muted small',
      `Primo allenamento singolo da <b>${ev.km} km</b> della settimana vince: <b>${ev.skin}</b>.<br>` +
      `<b class="${cdClass}">⏳ <span data-cd="week">…</span> alla fine dell'evento</b>`));
    const btn = el('button', 'btn btn-primary wide btn-small', `🏆 Reclama la Taglia`);
    btn.addEventListener('click', () => {
      const last = HERO.log[0];
      const today = new Date().toISOString().slice(0, 10);
      if (last && new Date(last.date).toISOString().slice(0, 10) === today && last.km >= ev.km) {
        if (RPG.claimEvent(STATE, HERO, ev)) {
          persist();
          toast(`🏆 ${ev.skin} è TUO!`);
          setTab('map');
        }
      } else {
        toast(`Serve un allenamento di almeno ${ev.km} km oggi per reclamarla!`);
      }
    });
    evp.appendChild(btn);
  }
  c.appendChild(evp);

  // ── Mappa Infuocata ──
  _renderMappaInfuocata(c);

  // ── Atlante: pulsante di accesso alla subview ──
  const atlasEntry = el('div', 'panel atlas-entry-panel');
  const unlockedCount = RPG.BIOMES.filter(b => HERO.level >= b.min).length;
  atlasEntry.innerHTML = `
    <div class="atlas-entry-row">
      <div>
        <div class="atlas-entry-title">📖 Atlante del Reame</div>
        <div class="small muted">${unlockedCount} / ${RPG.BIOMES.length} biomi scoperti</div>
      </div>
      <button class="btn btn-small atlas-open-btn">Esplora →</button>
    </div>`;
  atlasEntry.querySelector('.atlas-open-btn').addEventListener('click', () => {
    MAP_VIEW = 'atlas'; setTab('map');
  });
  c.appendChild(atlasEntry);

  // ── Classifica globale ──
  // ── Il Pantheon dei Campioni (entry) ──
  const pvpWins = HERO.pvpWins || 0;
  const pt = pvpTitle(pvpWins);
  const pvpEntry = el('div', 'panel pantheon-entry-panel');
  const pantheonThumb = document.createElement('img');
  pantheonThumb.src = 'assets/ui/pantheon-header.jpg';
  pantheonThumb.alt = '';
  pantheonThumb.className = 'camp-panel-thumb';
  pvpEntry.appendChild(pantheonThumb);
  pvpEntry.appendChild(el('h3', 'panel-title pantheon-entry-title', '🏛️ Il Pantheon dei Campioni'));
  if (pt) pvpEntry.appendChild(el('div', 'pantheon-rank-chip', `${pt.icon} ${pt.label}`));
  pvpEntry.appendChild(el('p', 'muted small', 'Classifica globale · I tuoi Rivali · Sfide PvP'));
  const enterPantheonBtn = el('button', 'btn btn-primary wide', '⚔️ Entra nel Pantheon');
  enterPantheonBtn.addEventListener('click', () => { MAP_VIEW = 'pantheon'; setTab('map'); });
  pvpEntry.appendChild(enterPantheonBtn);
  c.appendChild(pvpEntry);

}

function renderTavernaView(c) {
  const backBtn = el('button', 'view-back-link', '‹ Il Borgo');
  backBtn.addEventListener('click', () => { MARKET_VIEW = 'hub'; setTab('market'); });
  c.appendChild(backBtn);

  const heroImg = document.createElement('img');
  heroImg.src = 'assets/ui/taverna-header.jpg';
  heroImg.alt = '';
  heroImg.className = 'taverna-hero-img';
  heroImg.onerror = () => heroImg.remove();
  c.appendChild(heroImg);

  const grukBanner = npcBanner(
    'assets/avatars/npc/locandiere-orco.png',
    'Gruk il Bonaccione',
    '«Il nome è Gruk. Se perdi, paghi. Se vinci, offro io un boccale. Parola di oste.»'
  );
  grukBanner.classList.add('npc-banner-lg');
  c.appendChild(grukBanner);

  renderMiniGamesHub(c);
}

function renderBiscaView(c) {
  const backBtn = el('button', 'view-back-link view-back-link-bisca', '‹ Il Borgo');
  backBtn.addEventListener('click', () => { MARKET_VIEW = 'hub'; setTab('market'); });
  c.appendChild(backBtn);

  const headerImg = document.createElement('img');
  headerImg.src = 'assets/backgrounds/bg-bisca.jpg';
  headerImg.className = 'bisca-header-img';
  headerImg.alt = '';
  headerImg.onerror = () => headerImg.remove();
  c.appendChild(headerImg);

  const wrap = el('div', 'bisca-view-wrap');
  const inner = el('div', 'bisca-inner');
  wrap.appendChild(inner);
  c.appendChild(wrap);

  inner.appendChild(el('h2', 'bisca-title', '🃏 La Bisca Oscura'));

  // NPC biscazziere
  const npcBanner = el('div', 'npc-banner bisca-npc-banner');
  const npcImg = document.createElement('img');
  npcImg.src = 'assets/npcs/biscazziere.jpg';
  npcImg.className = 'npc-img bisca-npc-img';
  npcImg.alt = 'Il Biscazziere';
  npcImg.onerror = () => npcImg.remove();
  npcBanner.appendChild(npcImg);
  const npcQuote = el('p', 'npc-quote', '«Scegli il tuo campione. Punta l\'oro. Prega che regga.»');
  npcBanner.appendChild(npcQuote);
  inner.appendChild(npcBanner);

  RPG.biscaResetIfNeeded(HERO);
  const betsLeft = (HERO.bisca && HERO.bisca.betsLeft !== undefined) ? HERO.bisca.betsLeft : 0;

  const goldRow = el('div', 'bisca-gold-row');
  goldRow.innerHTML = `<span>🪙 Oro: <b id="bisca-gold-val">${HERO.gold || 0}</b></span><span class="bisca-bets-left" id="bisca-bets-counter">${betsLeft} / ${RPG.BISCA_DAILY_BETS} scommesse</span>`;
  inner.appendChild(goldRow);

  if (betsLeft <= 0) {
    inner.appendChild(el('div', 'panel bisca-empty', '⛔ Hai esaurito le scommesse di oggi. Torna domani.'));
    return;
  }

  const fighters = RPG.biscaPickFighters();
  if (!fighters) {
    inner.appendChild(el('div', 'panel bisca-empty', 'Nessun combattente disponibile.'));
    return;
  }
  const { a, b } = fighters;

  const arena = el('div', 'bisca-arena');

  const cardA = el('div', 'bisca-fighter bisca-fighter-a');
  const imgA = document.createElement('img');
  imgA.src = `assets/bestiario/${a.id}.png`;
  imgA.className = 'bisca-fighter-img';
  imgA.alt = '';
  imgA.onerror = () => imgA.remove();
  imgA.loading = 'lazy';
  const wrapA = el('div', 'bisca-fighter-img-wrap');
  wrapA.appendChild(imgA);
  cardA.appendChild(wrapA);
  cardA.appendChild(el('div', 'bisca-fighter-name', a.name));
  cardA.appendChild(el('div', 'bisca-fighter-zone small muted', a.zone));
  cardA.appendChild(el('div', 'bisca-fighter-weak small', `⚡ ${a.weakness}`));
  cardA.appendChild(el('div', 'bisca-odd bisca-odd-underdog', '×2.5'));

  const vsEl = el('div', 'bisca-vs', 'VS');

  const cardB = el('div', 'bisca-fighter bisca-fighter-b');
  const imgB = document.createElement('img');
  imgB.src = `assets/bestiario/${b.id}.png`;
  imgB.className = 'bisca-fighter-img';
  imgB.alt = '';
  imgB.onerror = () => imgB.remove();
  imgB.loading = 'lazy';
  const wrapB = el('div', 'bisca-fighter-img-wrap');
  wrapB.appendChild(imgB);
  cardB.appendChild(wrapB);
  cardB.appendChild(el('div', 'bisca-fighter-name', b.name));
  cardB.appendChild(el('div', 'bisca-fighter-zone small muted', b.zone));
  cardB.appendChild(el('div', 'bisca-fighter-weak small bisca-hidden', '⚡ ???'));
  cardB.appendChild(el('div', 'bisca-odd bisca-odd-fav', '×1.7'));

  arena.appendChild(cardA);
  arena.appendChild(vsEl);
  arena.appendChild(cardB);
  inner.appendChild(arena);

  const betPanel = el('div', 'panel bisca-bet-panel');
  betPanel.appendChild(el('div', 'bisca-bet-label', 'Puntata:'));

  const sizeRow = el('div', 'bisca-size-row');
  let selectedAmount = RPG.BISCA_BET_SIZES[0];
  RPG.BISCA_BET_SIZES.forEach(sz => {
    const btn = el('button', 'btn bisca-size-btn' + (sz === selectedAmount ? ' active' : ''), `🪙 ${sz}`);
    btn.addEventListener('click', () => {
      sizeRow.querySelectorAll('.bisca-size-btn').forEach(b2 => b2.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = sz;
    });
    sizeRow.appendChild(btn);
  });
  betPanel.appendChild(sizeRow);

  const actionRow = el('div', 'bisca-action-row');
  const betABtn = el('button', 'btn btn-secondary bisca-bet-btn', `Punta su ${a.name.split(' ').slice(0,2).join(' ')}`);
  const betBBtn = el('button', 'btn btn-primary bisca-bet-btn', `Punta su ${b.name.split(' ').slice(0,2).join(' ')}`);
  actionRow.appendChild(betABtn);
  actionRow.appendChild(betBBtn);
  betPanel.appendChild(actionRow);
  inner.appendChild(betPanel);

  const resultEl = el('div', 'bisca-result');
  resultEl.style.display = 'none';
  inner.appendChild(resultEl);

  async function placeBet(pick) {
    betABtn.disabled = true;
    betBBtn.disabled = true;
    resultEl.style.display = '';
    resultEl.innerHTML = `<div class="bisca-log-line bisca-log-intro">⚔️ I combattenti entrano nell'arena…</div>`;

    const fighterA = a.name;
    const fighterB = b.name;
    const logs = [
      `<b>${esc(fighterA)}</b> apre con un fendente!`,
      `<b>${esc(fighterB)}</b> risponde colpo su colpo!`,
      `Lo scontro si fa feroce — nessuno cede terreno…`,
    ];
    for (const log of logs) {
      await new Promise(r => setTimeout(r, 650));
      const line = el('div', 'bisca-log-line');
      line.innerHTML = log;
      resultEl.appendChild(line);
    }
    await new Promise(r => setTimeout(r, 750));

    const res = RPG.biscaBet(HERO, pick, a.id, b.id, selectedAmount);
    persist(); renderHUD();

    if (res.error === 'no_gold') {
      const errEl = el('div', 'bisca-verdict bisca-lose', '🪙 Oro insufficiente per questa puntata!');
      resultEl.appendChild(errEl);
      betABtn.disabled = false;
      betBBtn.disabled = false;
      return;
    }
    if (res.error === 'no_bets') {
      const errEl = el('div', 'bisca-verdict bisca-lose', '⛔ Scommesse esaurite per oggi.');
      resultEl.appendChild(errEl);
      return;
    }

    const winnerName = res.winner === 'a' ? fighterA : fighterB;
    const verdict = el('div', res.won ? 'bisca-verdict bisca-win' : 'bisca-verdict bisca-lose');
    verdict.innerHTML = res.won
      ? `🏆 <b>${esc(winnerName)}</b> vince lo scontro!<br>Hai guadagnato 🪙 <b>${res.payout}</b> Oro`
      : `💀 <b>${esc(winnerName)}</b> trionfa… Hai perso 🪙 <b>${res.amount}</b> Oro.`;
    resultEl.appendChild(verdict);

    if (res.won) { sfx('coin'); vibrate([80, 40, 160]); }

    document.getElementById('bisca-gold-val').textContent = HERO.gold || 0;
    document.getElementById('bisca-bets-counter').textContent = `${res.betsLeft} / ${RPG.BISCA_DAILY_BETS} scommesse`;

    if (res.betsLeft > 0) {
      const replayBtn = el('button', 'btn btn-primary wide bisca-replay-btn', '🎲 Nuovo scontro');
      replayBtn.addEventListener('click', () => { MARKET_VIEW = 'bisca'; setTab('market'); });
      resultEl.appendChild(replayBtn);
    }
  }

  betABtn.addEventListener('click', () => placeBet('a'));
  betBBtn.addEventListener('click', () => placeBet('b'));
}

/* ── Mappa Infuocata ─────────────────────────────────────────── */
function _renderMappaInfuocata(c) {
  const info = RPG.mappaInfuocataStatus(HERO);
  if (!info) return;

  const panel = el('div', 'panel mi-panel');

  if (info.status === 'offered') {
    panel.innerHTML = `
      <h3 class="panel-title">🗺️ Mappa Infuocata</h3>
      <p class="muted small">Una mappa segreta è disponibile questa settimana. Attivala e corri <b>10 km in 24 ore</b> per reclamare un bottino leggendario — ma la rarità cala con il passare del tempo!</p>
      <div class="mi-tiers-preview">
        <span class="mi-tier-dot" style="color:#d9822b">★ Leggendario</span> &lt;4h ·
        <span class="mi-tier-dot" style="color:#7b3fbf">★ Epico</span> &lt;8h ·
        <span class="mi-tier-dot" style="color:#2e6fb0">★ Raro</span> &lt;16h ·
        <span class="mi-tier-dot" style="color:#8a7a5f">★ Comune</span> &lt;24h
      </div>`;
    const btn = el('button', 'btn btn-primary wide mi-activate-btn', '🔥 Accendi la Mappa!');
    btn.addEventListener('click', () => {
      if (RPG.activateMappaInfuocata(HERO)) {
        persist();
        toast('🗺️ Mappa Infuocata attivata! Hai 24 ore per percorrere 10 km!');
        setTab('map');
      }
    });
    panel.appendChild(btn);

  } else if (info.status === 'active') {
    const pct = Math.min(100, Math.round((info.kmDone / 10) * 100));
    const hoursLeft = Math.floor(info.msLeft / 3600000);
    const tier = info.tier;
    const tierColor = tier ? tier.color : '#8a7a5f';
    const tierLabel = tier ? tier.label : 'Comune';
    panel.innerHTML = `
      <h3 class="panel-title">🗺️ Mappa Infuocata</h3>
      <div class="mi-status-row">
        <span class="mi-current-tier" style="color:${tierColor}">★ ${tierLabel}</span>
        <span class="mi-time-left" data-mi-cd>⏳ <span data-cd="mi">…</span></span>
      </div>
      <div class="mi-km-bar-wrap">
        <div class="mi-km-bar" style="width:${pct}%"></div>
      </div>
      <div class="mi-km-text">${info.kmDone.toFixed(1)} / 10 km — ${pct}%</div>
      <p class="muted small center">Più veloce arrivi a 10 km, più rara sarà la ricompensa!</p>`;

  } else if (info.status === 'ready') {
    const elapsed = Date.now() - info.activatedAt;
    const tier = RPG.MI_TIERS.find(t => elapsed < t.maxMs) || RPG.MI_TIERS[RPG.MI_TIERS.length - 1];
    panel.innerHTML = `
      <h3 class="panel-title">🗺️ Mappa Infuocata</h3>
      <p class="center" style="font-size:2rem">🎉</p>
      <p class="center"><b>10 km completati!</b></p>
      <p class="center muted small">Il tuo bottino: <b style="color:${tier.color}">★ ${tier.label}</b></p>`;
    const btn = el('button', 'btn btn-primary wide', '🎁 Reclama il Bottino!');
    btn.addEventListener('click', () => {
      const result = RPG.claimMappaInfuocata(HERO);
      if (result) {
        persist();
        modal(`
          <h3 class="panel-title">🗺️ Bottino della Mappa!</h3>
          <div class="mi-claim-reward">
            <div class="loot rar-${result.item.rarity} loot-with-img">
              ${itemIconHtml(result.item, 'item-icon-big')}
              <div class="loot-body">
                <div class="loot-head"><b>${esc(result.item.name)}</b> <span class="tag">${RPG.RARITIES[result.item.rarity].label}</span></div>
                <div class="small muted">${result.item.desc}</div>
              </div>
            </div>
          </div>
          <p class="muted center small">+ 🪙 ${result.gold} oro bonus!</p>
          <button class="btn btn-primary wide" onclick="closeModal();renderHUD();">Fantastico!</button>`);
        setTab('map');
      }
    });
    panel.appendChild(btn);

  } else if (info.status === 'burned') {
    panel.innerHTML = `
      <h3 class="panel-title">🗺️ Mappa Infuocata</h3>
      <p class="center muted">⏰ Il tempo è scaduto. La mappa si è consumata senza lasciare traccia…</p>
      <p class="muted small center">La prossima Mappa Infuocata apparirà la settimana prossima.</p>`;

  } else if (info.status === 'claimed') {
    panel.innerHTML = `
      <h3 class="panel-title">🗺️ Mappa Infuocata</h3>
      <p class="center">✅ Bottino reclamato questa settimana!</p>
      <p class="muted small center">La prossima Mappa Infuocata apparirà la settimana prossima.</p>`;
  }

  c.appendChild(panel);
}

/* ── Titoli PvP ─────────────────────────────────────────────── */
function pvpTitle(wins) {
  if (wins >= 10) return { label: 'Leggenda delle Sfide',   icon: '🏆' };
  if (wins >= 5)  return { label: 'Campione PvP',           icon: '⚔️' };
  if (wins >= 3)  return { label: 'Combattente di Sfide',   icon: '🥊' };
  if (wins >= 1)  return { label: 'Duellante',              icon: '🗡️' };
  return null;
}

/* ── Classifica Globale ─────────────────────────────────────── */
const CLASS_EMOJI = {
  eroe1:'🧑',eroe2:'👩',fabbro:'⚒️',stregone:'🧙',alchimista:'⚗️',
  furfante:'🗡️',maga:'🔮',paladino:'🛡️',ranger:'🏹',fata:'🧚',
  principe:'🦅',principessa:'🦋',regina:'👑',predone:'💀',principessa_ghiacci:'❄️',sacerdotessa_sole:'☀️',principessa_draghi:'🐉',
};

function _renderLeaderboardPanel() {
  const p = el('div', 'panel pvp-panel');
  const hdr = el('div', 'pvp-panel-hdr');
  hdr.innerHTML = '<span class="pvp-panel-title">🌍 Classifica Globale</span>';
  const refreshBtn = el('button', 'btn btn-small pvp-refresh-btn', '↻');
  refreshBtn.title = 'Aggiorna';
  hdr.appendChild(refreshBtn);
  p.appendChild(hdr);

  const list = el('div', 'lb-list');
  list.innerHTML = '<div class="lb-loading">Caricamento…</div>';
  p.appendChild(list);

  const load = async () => {
    refreshBtn.disabled = true;
    list.innerHTML = '<div class="lb-loading">Caricamento…</div>';
    const rows = await FB.getLeaderboard(25);
    if (!rows.length) { list.innerHTML = '<div class="lb-loading muted">Nessun eroe ancora online.</div>'; refreshBtn.disabled = false; return; }
    list.innerHTML = '';
    rows.forEach((h, i) => {
      const isMe = h.id === HERO.id;
      const isFriend = HERO.cloud.friends.includes(h.id);
      const row = el('div', 'lb-row' + (isMe ? ' lb-me' : ''));

      const rank   = el('span', 'lb-rank',   String(i + 1));
      const avatar = el('span', 'lb-avatar', CLASS_EMOJI[h.storyId] || '🧑');
      const name   = el('span', 'lb-name');
      name.innerHTML = esc(h.name) + (isMe ? ' <span class="lb-me-tag">tu</span>' : '');
      const lv  = el('span', 'lb-lv',  `Lv ${h.level || 1}`);
      const km  = el('span', 'lb-km',  `${(h.totalKm || 0).toFixed(1)} km`);

      row.appendChild(rank);
      row.appendChild(avatar);
      row.appendChild(name);
      row.appendChild(lv);
      row.appendChild(km);

      if (!isMe) {
        const btn = el('button', 'lb-rival-btn' + (isFriend ? ' lb-rival-added' : ''), isFriend ? '★' : '➕');
        btn.title = isFriend ? 'Già nella lista rivali' : 'Aggiungi ai rivali';
        btn.addEventListener('click', () => {
          if (isFriend) return;
          if (!HERO.cloud.friends.includes(h.id)) HERO.cloud.friends.push(h.id);
          persist();
          btn.textContent = '★';
          btn.classList.add('lb-rival-added');
          btn.title = 'Già nella lista rivali';
          toast('Rivale aggiunto! Sfidalo dalla scheda Rivali.');
        });
        row.appendChild(btn);
      } else {
        row.appendChild(el('span', 'lb-rival-spacer'));
      }

      list.appendChild(row);
    });
    refreshBtn.disabled = false;
  };

  refreshBtn.addEventListener('click', load);
  load();
  return p;
}

/* ── Rivali ─────────────────────────────────────────────────── */
function _renderRivalsPanel() {
  const friends = HERO.cloud.friends || [];
  const p = el('div', 'panel pvp-panel');
  const hdr = el('div', 'pvp-panel-hdr');
  hdr.innerHTML = '<span class="pvp-panel-title">👥 I Tuoi Rivali</span>';
  p.appendChild(hdr);

  if (!friends.length) {
    p.appendChild(el('p', 'muted small', 'Nessun rivale ancora. Usa ➕ in classifica per aggiungerne uno.'));
    return p;
  }

  const ac = HERO.cloud && HERO.cloud.activeChallenge;
  const list = el('div', 'rivals-list');
  list.innerHTML = '<div class="lb-loading">Caricamento…</div>';
  p.appendChild(list);

  (async () => {
    list.innerHTML = '';
    // Carica tutti i rivali in parallelo
    const heroData = await Promise.all(friends.map(fid => FB.getHero(fid)));

    friends.forEach((fid, idx) => {
      const fh  = heroData[idx];
      const row = el('div', 'rival-row');

      if (!fh) {
        row.innerHTML = `<span class="rival-avatar">❓</span><span class="rival-info muted small">${esc(fid.slice(0,8))}…</span>`;
        const rmBtn = el('button', 'rival-rm-btn', '🗑️');
        rmBtn.title = 'Rimuovi';
        rmBtn.addEventListener('click', () => {
          HERO.cloud.friends = HERO.cloud.friends.filter(x => x !== fid);
          persist(); row.remove();
        });
        row.appendChild(rmBtn);
        list.appendChild(row);
        return;
      }

      const avatar  = el('span', 'rival-avatar', CLASS_EMOJI[fh.storyId] || '🧑');
      const info    = el('span', 'rival-info');
      info.innerHTML = `<b>${esc(fh.name)}</b> <span class="muted small">Lv ${fh.level || 1} · ${(fh.totalKm || 0).toFixed(1)} km</span>`;
      const actions = el('span', 'rival-actions');

      if (ac) {
        actions.appendChild(el('span', 'muted small', '⚔️ sfida in corso'));
      } else {
        const chalBtn = el('button', 'btn btn-small rival-chal-btn', '⚔️ Sfida');
        chalBtn.addEventListener('click', async () => {
          chalBtn.disabled = true; chalBtn.textContent = '…';
          const cid = await FB.createChallenge(HERO);
          if (!cid) { chalBtn.textContent = 'Errore'; return; }
          const sent = await FB.sendChallengeInvite(cid, HERO, fh.id);
          if (!sent) { FB.deleteChallenge(cid); chalBtn.textContent = 'Errore'; return; }
          HERO.cloud.activeChallenge = { id: cid, role: 'creator' };
          persist();
          chalBtn.textContent = '✅ Invito inviato!';
          chalBtn.disabled = true;
        });
        actions.appendChild(chalBtn);
      }

      const rmBtn = el('button', 'rival-rm-btn', '🗑️');
      rmBtn.title = 'Rimuovi rivale';
      rmBtn.addEventListener('click', () => {
        HERO.cloud.friends = HERO.cloud.friends.filter(x => x !== fid);
        persist(); row.remove();
      });

      row.appendChild(avatar);
      row.appendChild(info);
      row.appendChild(actions);
      row.appendChild(rmBtn);
      list.appendChild(row);
    });

    if (!list.children.length) list.innerHTML = '<div class="muted small">Lista vuota.</div>';
  })();

  return p;
}

function showChallengeInviteModal(invite) {
  modal(`
    <h3 class="panel-title">⚔️ Sfida Ricevuta!</h3>
    <p class="center" style="font-size:2rem">${CLASS_EMOJI[invite.fromStoryId] || '🧑'}</p>
    <p class="center"><b>${esc(invite.fromName)}</b> (Lv ${invite.fromLevel || 1}) ti sfida a chi percorre più km in 7 giorni!</p>
    <div class="pvp-btn-row">
      <button class="btn btn-primary" id="inv-accept">✅ Accetta</button>
      <button class="btn" id="inv-decline">❌ Rifiuta</button>
    </div>`,
  );
  document.getElementById('inv-accept').addEventListener('click', async () => {
    const ok = await FB.joinChallenge(invite.challengeId, HERO);
    if (ok) {
      HERO.cloud.activeChallenge = { id: invite.challengeId, role: 'opponent' };
      persist();
    }
    await FB.clearPendingInvite(HERO.id, invite.challengeId);
    nextOpening();
    if (ok) toast('Sfida accettata! Percorri più km del tuo rivale in 7 giorni.');
    else toast('Errore nell\'accettare la sfida. Riprova.');
  });
  document.getElementById('inv-decline').addEventListener('click', async () => {
    await FB.deleteChallenge(invite.challengeId);
    await FB.clearPendingInvite(HERO.id, invite.challengeId);
    nextOpening();
  });
}

/* ── Sfide PvP ───────────────────────────────────────────────── */
function _renderPvpPanel() {
  const p = el('div', 'panel pvp-panel');
  p.appendChild(el('div', 'pvp-panel-title', '⚔️ Sfida un Amico'));

  const inner = el('div');
  p.appendChild(inner);

  const refresh = async () => {
    inner.innerHTML = '<div class="lb-loading">…</div>';
    const ac = HERO.cloud && HERO.cloud.activeChallenge;

    if (ac) {
      // Carica dati sfida attiva
      const ch = await FB.getChallenge(ac.id);
      if (!ch) {
        // Sfida non trovata — pulisci
        HERO.cloud.activeChallenge = null; persist();
        inner.innerHTML = ''; _buildPvpIdle(inner, refresh); return;
      }
      _buildPvpActive(inner, ch, refresh);
    } else {
      _buildPvpIdle(inner, refresh);
    }
  };

  refresh();
  return p;
}

function _buildPvpIdle(container, refresh) {
  container.innerHTML = '';
  container.appendChild(el('p', 'muted small', 'Sfida un amico a chi percorre più km in 7 giorni. Chi vince porta a casa oro e gloria.'));

  const createBtn = el('button', 'btn btn-primary wide', '⚔️ Crea una sfida');
  createBtn.addEventListener('click', async () => {
    createBtn.disabled = true;
    createBtn.textContent = 'Creazione…';
    const code = await FB.createChallenge(HERO);
    if (!code) { toast('❌ Errore di rete. Riprova.'); createBtn.disabled = false; createBtn.textContent = '⚔️ Crea una sfida'; return; }
    HERO.cloud.activeChallenge = { id: code, role: 'creator' };
    persist();
    modal(`
      <h3 class="panel-title">⚔️ Sfida Creata!</h3>
      <p class="muted small">Condividi questo codice con il tuo avversario:</p>
      <div class="pvp-code-box">${esc(code)}</div>
      <p class="muted small center">La sfida dura 7 giorni. Chi percorre più km vince.</p>
      <button class="btn btn-primary wide" id="btn-pvp-copy">📋 Copia codice</button>
      <button class="btn wide" style="margin-top:.4rem" onclick="closeModal()">Chiudi</button>`);
    document.getElementById('btn-pvp-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => toast('✅ Codice copiato!')).catch(() => {});
    });
    refresh();
  });
  container.appendChild(createBtn);

  const sep = el('div', 'pvp-sep', 'oppure unisciti a una sfida esistente');
  container.appendChild(sep);

  const row = el('div', 'pvp-join-row');
  const inp = el('input', 'input pvp-code-input');
  inp.placeholder = 'Codice (es. AB3K7X)';
  inp.maxLength = 6;
  inp.style.textTransform = 'uppercase';
  const joinBtn = el('button', 'btn', 'Unisciti');
  joinBtn.addEventListener('click', async () => {
    const code = inp.value.trim().toUpperCase();
    if (code.length !== 6) { toast('Il codice deve essere di 6 caratteri.'); return; }
    joinBtn.disabled = true;
    joinBtn.textContent = '…';
    const ch = await FB.getChallenge(code);
    if (!ch) { toast('❌ Codice non trovato.'); joinBtn.disabled = false; joinBtn.textContent = 'Unisciti'; return; }
    if (ch.status !== 'waiting') { toast('Questa sfida è già in corso o terminata.'); joinBtn.disabled = false; joinBtn.textContent = 'Unisciti'; return; }
    if (ch.creatorId === HERO.id) { toast('Non puoi sfidare te stesso!'); joinBtn.disabled = false; joinBtn.textContent = 'Unisciti'; return; }
    modal(`
      <h3 class="panel-title">⚔️ Accetta la sfida?</h3>
      <p><b>${CLASS_EMOJI[ch.creatorStoryId] || '🧑'} ${esc(ch.creatorName)}</b> (Lv ${ch.creatorLevel}) ti sfida a chi percorre più km in 7 giorni.</p>
      <div class="row gap" style="margin-top:1rem">
        <button class="btn wide" onclick="closeModal()">Rifiuta</button>
        <button class="btn btn-primary wide" id="btn-pvp-accept">⚔️ Accetta</button>
      </div>`);
    document.getElementById('btn-pvp-accept').addEventListener('click', async () => {
      const ok = await FB.joinChallenge(code, HERO);
      if (!ok) { toast('❌ Errore. Riprova.'); closeModal(); return; }
      HERO.cloud.activeChallenge = { id: code, role: 'opponent' };
      persist();
      closeModal();
      toast('⚔️ Sfida accettata! Che vinca il migliore!');
      refresh();
    });
  });
  row.appendChild(inp);
  row.appendChild(joinBtn);
  container.appendChild(row);
}

function _buildPvpActive(container, ch, refresh) {
  container.innerHTML = '';
  const ac      = HERO.cloud.activeChallenge;
  const isCreator = ac.role === 'creator';
  const myKmStart = isCreator ? ch.creatorKmStart : ch.opponentKmStart;
  const myKmNow   = isCreator ? ch.creatorKmNow   : ch.opponentKmNow;
  const theirKmStart = isCreator ? ch.opponentKmStart : ch.creatorKmStart;
  const theirKmNow   = isCreator ? ch.opponentKmNow   : ch.creatorKmNow;
  const myDelta    = Math.max(0, (myKmNow    || 0) - (myKmStart    || 0));
  const theirDelta = Math.max(0, (theirKmNow || 0) - (theirKmStart || 0));
  const myName    = HERO.name;
  const theirName = isCreator ? (ch.opponentName || '—') : ch.creatorName;
  const theirStory= isCreator ? (ch.opponentStoryId || 'eroe1') : ch.creatorStoryId;
  const maxDelta  = Math.max(myDelta, theirDelta, 1);
  const expired   = new Date() > new Date(ch.endDate + 'T23:59:59');
  const waiting   = ch.status === 'waiting';

  if (ch.status === 'completed') {
    const iWon = ch.winnerId === HERO.id;
    container.appendChild(el('div', 'pvp-result ' + (iWon ? 'pvp-win' : 'pvp-loss'),
      iWon ? '🏆 Hai vinto la sfida!' : '💀 Hai perso la sfida.'));
    container.appendChild(el('div', 'pvp-stats-row',
      `Tu: <b>${myDelta.toFixed(1)} km</b> &nbsp;·&nbsp; ${esc(theirName)}: <b>${theirDelta.toFixed(1)} km</b>`));

    // Ricompensa da ritirare (solo chi ha vinto e non ha ancora riscosso)
    const claimed = (HERO.cloud.claimedChallenges || []).includes(ch.id);
    if (iWon && !claimed) {
      const reward = 150 + (HERO.level || 1) * 10;
      const claimBtn = el('button', 'btn btn-primary wide pvp-claim-btn', `🎁 Ritira ricompensa: ${reward} 🪙`);
      claimBtn.addEventListener('click', () => {
        HERO.gold = (HERO.gold || 0) + reward;
        HERO.pvpWins = (HERO.pvpWins || 0) + 1;
        HERO.cloud.claimedChallenges = [...(HERO.cloud.claimedChallenges || []), ch.id];
        persist(); updateHUD();
        const pt = pvpTitle(HERO.pvpWins);
        const titleLine = pt ? `<p class="pvp-new-title">${pt.icon} Nuovo titolo: <b>${pt.label}</b></p>` : '';
        modal(`
          <div class="pvp-claim-modal">
            <div class="pvp-claim-icon">🏆</div>
            <h3 class="panel-title">Vittoria!</h3>
            <p class="pvp-claim-gold">+${reward} <span class="pvp-gold-coin">🪙</span></p>
            ${titleLine}
            <p class="muted small">Sfide vinte totali: <b>${HERO.pvpWins}</b></p>
            <button class="btn btn-primary wide" onclick="closeModal()">Grande!</button>
          </div>`);
        claimBtn.remove();
      });
      container.appendChild(claimBtn);
    }

    const closeBtn = el('button', 'btn wide', 'Chiudi sfida');
    closeBtn.addEventListener('click', async () => {
      await FB.deleteChallenge(ch.id);
      HERO.cloud.activeChallenge = null; persist();
      refresh();
    });
    container.appendChild(closeBtn);
    return;
  }

  if (waiting) {
    container.appendChild(el('p', 'muted small', `In attesa che qualcuno usi il codice:`));
    const codeEl = el('div', 'pvp-code-box', esc(ch.id));
    container.appendChild(codeEl);
    const copyBtn = el('button', 'btn btn-small', '📋 Copia');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(ch.id).then(() => toast('✅ Codice copiato!')).catch(() => {});
    });
    container.appendChild(copyBtn);
  } else {
    // Barre progresso
    const endDate = ch.endDate;
    const daysLeft = Math.max(0, Math.ceil((new Date(endDate + 'T23:59:59') - new Date()) / 86400000));
    container.appendChild(el('div', 'pvp-countdown', `⏳ ${expired ? 'Terminata' : daysLeft + ' giorni rimasti'}`));

    const mkBar = (name, storyId, delta, isMe) => {
      const pct = Math.round(delta / maxDelta * 100);
      const row = el('div', 'pvp-bar-row');
      row.innerHTML =
        `<span class="pvp-bar-label">${CLASS_EMOJI[storyId] || '🧑'} ${esc(name)}${isMe ? ' <span class="lb-me-tag">tu</span>' : ''}</span>` +
        `<div class="pvp-bar-wrap"><div class="pvp-bar-fill${isMe ? ' pvp-bar-me' : ''}" style="width:${pct}%"></div></div>` +
        `<span class="pvp-bar-km">${delta.toFixed(1)} km</span>`;
      return row;
    };
    container.appendChild(mkBar(myName, HERO.storyId || 'eroe1', myDelta, true));
    container.appendChild(mkBar(theirName, theirStory, theirDelta, false));
    const refreshBtn = el('button', 'btn btn-small pvp-refresh-btn', '🔄 Aggiorna');
    refreshBtn.addEventListener('click', refresh);
    container.appendChild(refreshBtn);
  }

  const abandonBtn = el('button', 'btn btn-small pvp-abandon', '🏳️ Abbandona sfida');
  abandonBtn.addEventListener('click', () => {
    modal(`
      <h3 class="panel-title">🏳️ Abbandonare?</h3>
      <p>La sfida verrà eliminata. Stai sicuro?</p>
      <div class="row gap" style="margin-top:1rem">
        <button class="btn wide" onclick="closeModal()">Annulla</button>
        <button class="btn btn-danger wide" id="btn-pvp-abandon-confirm">Abbandona</button>
      </div>`);
    document.getElementById('btn-pvp-abandon-confirm').addEventListener('click', async () => {
      await FB.deleteChallenge(ch.id);
      HERO.cloud.activeChallenge = null; persist();
      closeModal(); refresh();
    });
  });
  container.appendChild(abandonBtn);
}

let MAP_VIEW = 'main';

function renderAvampostoView(c) {
  const banner = el('div', 'subview-hero-banner avamposto-hero-banner');
  const backBtn = el('button', 'btn btn-small subview-back-btn', '← Mappa');
  backBtn.addEventListener('click', () => { MAP_VIEW = 'main'; setTab('map'); });
  banner.appendChild(backBtn);
  banner.appendChild(el('h2', 'section-title subview-banner-title', '🏕️ Avamposto delle Spedizioni'));
  c.appendChild(banner);

  // Missione attiva
  if (HERO.activeMission) {
    const m = RPG.MISSIONS.find(x => x.id === HERO.activeMission.id);
    const p = el('div', 'panel panel-featured active-mission');
    p.appendChild(el('h3', 'panel-title', `🐎 In Viaggio: ${m.name}`));
    const done = HERO.activeMission.progressKm;
    const pct = Math.min(100, Math.round(done / m.km * 100));
    const remaining = Math.max(0, m.km - done);
    const boss = RPG.BESTIARY.find(b => b.mission === m.id);
    const prog = el('div', 'active-mission-prog');
    if (boss) {
      const bossImg = el('img', 'mission-boss-img');
      bossImg.src = `assets/bestiario/${boss.id}.png`;
      bossImg.alt = boss.name;
      bossImg.onerror = () => bossImg.remove();
      prog.appendChild(bossImg);
    }
    const progWrap = el('div', 'mission-prog-wrap');
    progWrap.innerHTML = `<div class="mission-prog-bar">
      <div class="mission-prog-fill" style="width:${pct}%"></div>
      <div class="mission-prog-label">${done.toFixed(1)} / ${m.km} km · ${pct}%</div>
    </div>
    <div class="mission-prog-remaining">⚔️ Mancano <b>${remaining.toFixed(1)} km</b> alla destinazione${boss ? ` · ${boss.name} ti aspetta` : ''}</div>`;
    prog.appendChild(progWrap);
    p.appendChild(prog);
    const abandon = el('button', 'btn btn-small', 'Abbandona');
    abandon.addEventListener('click', () => { HERO.activeMission = null; persist(); setTab('map'); });
    p.appendChild(abandon);
    c.appendChild(p);
  }

  // Missioni disponibili
  const avail = RPG.availableMissions(HERO);
  if (avail.length) {
    const mp = el('div', 'panel');
    mp.appendChild(el('h3', 'panel-title', '⚔️ Missioni Disponibili'));
    avail.forEach(m => {
      const row = el('div', 'mission-row');
      row.appendChild(el('div', 'mission-zone-icon', zoneIcon(m.zone)));
      const diffColor = m.km <= 10 ? 'var(--rar-comune)' : m.km <= 25 ? 'var(--rar-raro)' : m.km <= 50 ? 'var(--rar-epico)' : 'var(--rar-leggendario)';
      const diffLabel = m.km <= 10 ? 'Breve' : m.km <= 25 ? 'Media' : m.km <= 50 ? 'Lunga' : 'Epica';
      const diffPct = Math.min(100, Math.round(m.km / 60 * 100));
      row.appendChild(el('div', 'mission-mid',
        `<b>${m.name}</b> <span class="tag">${m.km} km</span><br>` +
        `<span class="small muted">${zoneShort(m.zone)} — ${m.desc}</span>` +
        `<div class="mission-difficulty"><span style="font-size:.6rem;color:${diffColor}">${diffLabel}</span><div style="flex:1;height:4px;background:rgba(0,0,0,.25);border-radius:2px;overflow:hidden"><div style="width:${diffPct}%;height:100%;background:${diffColor};border-radius:2px"></div></div></div>`));
      const btn = el('button', 'btn btn-small btn-primary', 'Parti');
      const vimg = new Image();
      vimg.onload = () => {
        btn.classList.add('btn-plaque-small');
        btn.innerHTML = '';
        vimg.className = 'plaque-img-small';
        btn.appendChild(vimg);
      };
      vimg.src = 'assets/ui/btn-viaggio.png';
      btn.disabled = !!HERO.activeMission;
      btn.addEventListener('click', () => {
        RPG.startMission(HERO, m.id); persist();
        toast(`🐎 In sella! Destinazione: ${m.name} (${m.km} km)`);
        setTab('map');
      });
      row.appendChild(btn);
      mp.appendChild(row);
    });
    c.appendChild(mp);
  } else if (!HERO.activeMission) {
    c.appendChild(el('div', 'panel', '<p class="muted small center">Nessuna missione disponibile al momento. Esplora nuovi biomi per sbloccarle.</p>'));
  }
}

function renderPantheonView(c) {
  const banner = el('div', 'subview-hero-banner pantheon-hero-banner');
  const backBtn = el('button', 'btn btn-small subview-back-btn', '← Mappa');
  backBtn.addEventListener('click', () => { MAP_VIEW = 'main'; setTab('map'); });
  banner.appendChild(backBtn);
  banner.appendChild(el('h2', 'section-title subview-banner-title pantheon-title', '🏛️ Il Pantheon dei Campioni'));
  c.appendChild(banner);

  c.appendChild(_renderLeaderboardPanel());
  c.appendChild(_renderRivalsPanel());
  c.appendChild(_renderPvpPanel());
}

function renderAtlasView(c) {
  const back = el('button', 'btn btn-small', '← Mappa');
  back.addEventListener('click', () => { MAP_VIEW = 'main'; setTab('map'); });
  c.appendChild(back);
  c.appendChild(el('h2', 'section-title', '📖 Atlante del Reame'));

  const biome = RPG.currentBiome(HERO.level);
  const grid = el('div', 'biome-atlas');
  RPG.BIOMES.forEach(b => {
    const open = HERO.level >= b.min;
    const isCurrent = b === biome;
    const slug = RPG.biomeSlug(b);
    const cls = ['biome-atlas-card', open ? '' : 'locked', isCurrent ? 'current' : ''].filter(Boolean).join(' ');
    const card = el('div', cls);
    if (open && slug) {
      const bg = el('img', 'bac-bg');
      bg.src = `assets/biomi/${slug}.jpg`;
      bg.alt = '';
      bg.loading = 'lazy';
      card.appendChild(bg);
    }
    const info = el('div', 'bac-info');
    if (open) {
      info.innerHTML = `<div class="bac-icon">${b.icon}</div>
        <div class="bac-name">${zoneShort(b.name)}</div>
        <div class="bac-lv">Liv. ${b.min}–${b.max}</div>`;
    } else {
      info.innerHTML = `<div class="bac-lv">Liv. ${b.min}–${b.max}</div>`;
      const lockDiv = el('div', 'bac-lock');
      lockDiv.innerHTML = `<span class="bac-lock-icon">🔒</span><div class="bac-lock-lv">Sblocca al Liv. ${b.min}</div>`;
      card.appendChild(lockDiv);
    }
    card.appendChild(info);
    if (isCurrent) {
      const badge = el('div', 'bac-current-badge', 'QUI');
      card.appendChild(badge);
    }
    if (open) card.addEventListener('click', () => showBiomePreview(b, open));
    grid.appendChild(card);
  });
  c.appendChild(grid);
}

function zoneShort(zone) {
  return zone.replace(/^(Il |La |Le |L')/, '');
}

function zoneIcon(zone) {
  const b = RPG.BIOMES.find(x => x.name === zone);
  return b ? b.icon : '📍';
}

/* ── TAB: Allenati ── */
let CHALLENGE_TAB = 'daily';

function _timeUntilMidnight() {
  const now = new Date(), next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const d = next - now;
  const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000);
  return `${h}h ${m}m`;
}
function _timeUntilMonday() {
  const now = new Date();
  const days = (8 - now.getDay()) % 7 || 7;
  const mon = new Date(now); mon.setDate(now.getDate() + days); mon.setHours(0, 0, 0, 0);
  const d = mon - now;
  const dd = Math.floor(d / 86400000), h = Math.floor((d % 86400000) / 3600000);
  return dd > 0 ? `${dd}g ${h}h` : `${h}h`;
}

function renderChallengeList(panel, list, claimFn, bonusObj, bonusClaimed, countdown) {
  list.forEach((ch, i) => {
    const done = ch.progress >= ch.target;
    const row = el('div', 'challenge-row' + (ch.claimed ? ' ch-claimed' : done ? ' ch-completable' : ''));
    const pct = Math.min(100, Math.round(ch.progress / ch.target * 100));
    const progTxt = ch.type === 'km'
      ? `${Math.min(ch.progress, ch.target).toFixed(1)} / ${ch.target} km`
      : `${Math.min(Math.round(ch.progress), ch.target)} / ${ch.target}`;
    row.innerHTML = `
      <div class="challenge-head">
        <span class="challenge-icon">${ch.icon}</span>
        <div class="challenge-mid">
          <span class="challenge-label">${esc(ch.label)}</span>
          <span class="challenge-rew muted small">🪙 ${ch.reward.gold} &nbsp;⭐ ${ch.reward.xp} XP</span>
        </div>
        ${ch.claimed ? '<span class="challenge-check">✓</span>' : ''}
      </div>
      <div class="membar slim">
        <div class="membar-fill ${done ? 'gold' : 'blue'}" style="width:${pct}%"></div>
        <span>${progTxt}</span>
      </div>`;
    if (done && !ch.claimed) {
      const btn = el('button', 'btn btn-primary btn-small wide', '✅ Riscuoti');
      btn.addEventListener('click', () => {
        const r = claimFn(HERO, i);
        persist(); renderHUD();
        if (r && r.ok) {
          const consNote = r.consumable ? ` · 💰 ${r.consumable.icon} ${esc(r.consumable.name)}` : '';
          toast(r.bonus
            ? `🌟 BONUS! +${r.bonus.gold + r.reward.gold}🪙 +${r.bonus.xp + r.reward.xp}⭐${consNote}`
            : `🎯 +${r.reward.gold}🪙 +${r.reward.xp}⭐${consNote}`);
          sfx('coin'); vibrate(r.bonus ? [40, 20, 40] : 30);
        } else toast(r);
        updateBadges(); setTab('train');
      });
      row.appendChild(btn);
    }
    panel.appendChild(row);
  });
  const bonusRow = el('div', 'challenge-bonus-row' + (bonusClaimed ? ' ch-claimed' : ''));
  bonusRow.innerHTML = `<span>🌟 Tutte — Bonus</span>
    <span class="muted small">+${bonusObj.gold}🪙 +${bonusObj.xp}⭐
    ${bonusClaimed ? ' · ✓ riscosso' : ''}</span>`;
  panel.appendChild(bonusRow);

  if (list.every(ch => ch.claimed) && bonusClaimed && countdown) {
    const es = el('div', 'ch-empty-state');
    es.innerHTML = `<div class="ch-empty-icon">🎉</div>
      <div class="ch-empty-text">Tutte le sfide completate!</div>
      <div class="ch-empty-countdown">Prossimo reset tra <b>${countdown}</b></div>`;
    panel.appendChild(es);
  }
}

function renderDailyChallenges(c) {
  const dc = RPG.getDailyChallenges(HERO);
  const wc = RPG.getWeeklyChallenges(HERO);
  const dailyClaimable = dc.list.filter(ch => ch.progress >= ch.target && !ch.claimed).length;
  const weeklyClaimable = wc.list.filter(ch => ch.progress >= ch.target && !ch.claimed).length;
  const totalClaimable = dailyClaimable + weeklyClaimable;

  const panel = el('div', totalClaimable ? 'panel panel-featured' : 'panel');

  /* header + badge */
  const titleRow = el('div', 'challenge-title-row');
  titleRow.innerHTML = `<h3 class="panel-title" style="margin:0">🎯 Sfide</h3>`;
  if (totalClaimable) titleRow.appendChild(el('span', 'mg-card-badge', String(totalClaimable)));
  panel.appendChild(titleRow);

  /* tab pills */
  const tabs = el('div', 'ch-tab-row');
  [['daily', `Giornaliere${dailyClaimable ? ` (${dailyClaimable})` : ''}`],
   ['weekly', `Settimanali${weeklyClaimable ? ` (${weeklyClaimable})` : ''}`]].forEach(([key, label]) => {
    const t = el('button', 'ch-tab-pill' + (CHALLENGE_TAB === key ? ' active' : ''), label);
    t.addEventListener('click', () => { CHALLENGE_TAB = key; setTab('train'); });
    tabs.appendChild(t);
  });
  panel.appendChild(tabs);

  if (CHALLENGE_TAB === 'daily') {
    renderChallengeList(panel, dc.list, RPG.claimChallenge, RPG.DAILY_CHALLENGES_BONUS, dc.bonusClaimed, _timeUntilMidnight());
  } else {
    renderChallengeList(panel, wc.list, RPG.claimWeeklyChallenge, RPG.WEEKLY_CHALLENGES_BONUS, wc.bonusClaimed, _timeUntilMonday());
  }

  c.appendChild(panel);
}

function renderTrain(c) {
  let chosen = 'camminata';

  // ── Strip incolla-passi: sempre visibile, nessun popup ──
  const syncStrip = el('div', 'step-sync-strip');
  syncStrip.innerHTML = `<span class="sss-label">⚡ Passi da Salute</span>
    <input class="sss-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Incolla o digita i passi…">`;
  const sssInput = syncStrip.querySelector('.sss-input');
  const applySss = () => {
    const steps = parseInt(sssInput.value, 10);
    if (!(steps > 0)) return;
    const km = Math.round(steps * 0.00075 * 100) / 100;
    if (km < 0.05) { toast(`${steps} passi (${km} km) — troppo pochi.`); sssInput.value = ''; return; }
    const isFirst = (HERO.onboardingStep || 0) <= 1;
    const report = RPG.logHealthSync(HERO, chosen, km);
    sssInput.value = '';
    if (report) {
      if (isFirst) HERO.onboardingStep = 2;
      persist(); renderHUD();
      showHealthSyncResult(report);
      if (isFirst) OPEN_QUEUE.push(showFirstWorkoutCelebration);
      checkMapNotify(); maybeSyncChallenge();
      updateTabOnboardingPulse();
    }
    else toast('Attività già sincronizzata per oggi.');
  };
  sssInput.addEventListener('paste', () => setTimeout(applySss, 150));
  sssInput.addEventListener('keydown', e => { if (e.key === 'Enter') applySss(); });
  c.appendChild(syncStrip);

  // Banner primo accesso — spiega come inserire i dati
  if (!HERO.trainTipDismissed) {
    const tip = el('div', 'train-first-tip');
    tip.innerHTML = `
      <button class="train-tip-close" id="train-tip-close">✕</button>
      <div class="train-tip-title">📲 Come registrare la tua attività</div>
      <div class="train-tip-row">
        <span class="train-tip-step">🍎</span>
        <div>
          <b>iPhone — Comando Rapido</b> <span class="train-tip-badge">più veloce</span><br>
          <span class="muted small">Scorri giù fino a <b>🔄 Importa da fitness → scheda iOS</b> e segui la guida per configurare il Comando Rapido una sola volta. Da quel momento basteranno 3 secondi.</span>
        </div>
      </div>
      <div class="train-tip-row">
        <span class="train-tip-step">🤖</span>
        <div>
          <b>Android — MacroDroid o Tasker</b><br>
          <span class="muted small">Scorri giù fino a <b>🔄 Importa da fitness → scheda Android</b> e scegli il metodo che preferisci per sincronizzare i passi automaticamente.</span>
        </div>
      </div>`;
    c.appendChild(tip);
    tip.querySelector('#train-tip-close').addEventListener('click', () => {
      HERO.trainTipDismissed = true;
      persist();
      tip.classList.add('tip-out');
      setTimeout(() => tip.remove(), 250);
    });
  }

  // ── Fiamma della Streak ──
  const sc = HERO.streak && HERO.streak.count || 0;
  if (sc >= 5) {
    const streakCap = 0.30;
    const bonusPct = Math.round(Math.min(streakCap, (sc - 1) * 0.05) * 100);
    const maxBonusPct = Math.round(streakCap * 100);
    const flamePct = Math.min(100, Math.round(bonusPct / maxBonusPct * 100));
    const flameEmoji = sc >= 30 ? '🩵' : sc >= 15 ? '🔥' : '🔥';
    const flameSize = sc >= 30 ? '2.8rem' : sc >= 15 ? '2.4rem' : '2rem';
    const flameCls = sc >= 30 ? 'streak-flame-l' : sc >= 15 ? 'streak-flame-m' : 'streak-flame-s';
    const sf = el('div', `panel streak-flame-panel ${flameCls}`);
    sf.innerHTML = `
      <div class="sf-header">
        <span class="sf-emoji" style="font-size:${flameSize}">${flameEmoji}</span>
        <div class="sf-info">
          <div class="sf-title">Striscia di ${sc} giorni</div>
          <div class="sf-bonus">+${bonusPct}% XP per ogni allenamento</div>
        </div>
      </div>
      <div class="sf-bar-wrap">
        <div class="sf-bar" style="width:${flamePct}%"></div>
      </div>
      <div class="sf-labels">
        <span class="muted small">+5%</span>
        <span class="muted small">Massimo +${maxBonusPct}%</span>
      </div>`;
    c.appendChild(sf);
  }

  // ── Buff consumabili attivi ──
  {
    const bff = HERO.consumableBuffs || {};
    const now = Date.now();
    const chips = [];
    const hLeft = ms => { const h = Math.round(ms / 3600000); return h <= 1 ? '< 1h' : `${h}h`; };
    if (bff.xpMult)       chips.push(`✨ +${Math.round(bff.xpMult.value * 100)}% XP · ancora ${bff.xpMult.sessions} ${bff.xpMult.sessions === 1 ? 'sessione' : 'sessioni'}`);
    if (bff.goldMult && bff.goldMult.expiresAt > now) chips.push(`💰 +${Math.round(bff.goldMult.value * 100)}% oro · scade in ${hLeft(bff.goldMult.expiresAt - now)}`);
    if (bff.allBoost && bff.allBoost.expiresAt > now) chips.push(`⚡ Tutti i bonus ×${1+bff.allBoost.value} · scade in ${hLeft(bff.allBoost.expiresAt - now)}`);
    if (bff.streakShield) chips.push(`🛡️ Streak protetta · ${bff.streakShield}gg rimasti`);
    if (bff.arenaShield)  chips.push(`⚔️ Scudo Arena · ${bff.arenaShield}gg rimasti`);
    if (bff.dropBoost && bff.dropBoost.expiresAt > now) chips.push(`🎁 +${Math.round(bff.dropBoost.value * 100)}% drop · scade in ${hLeft(bff.dropBoost.expiresAt - now)}`);
    if (chips.length) {
      const strip = el('div', 'buff-strip');
      chips.forEach(t => strip.appendChild(el('span', 'buff-chip', t)));
      c.appendChild(strip);
    }
  }

  // ── Consumabile rapido pre-allenamento ──
  {
    const owned = HERO.consumables || {};
    const quickCons = RPG.CONSUMABLES.filter(co => (owned[co.id] || 0) > 0);
    if (quickCons.length) {
      const qp = el('div', 'quick-cons-strip panel');
      qp.appendChild(el('div', 'quick-cons-label', '💊 Potenzia prima di allenarti'));
      const row = el('div', 'quick-cons-row');
      quickCons.forEach(co => {
        const btn = el('button', `quick-cons-btn rarity-${co.rarity}`, '');
        btn.title = `${co.name} (×${owned[co.id]}) — ${co.desc}`;
        const img = el('img', 'quick-cons-img');
        img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.png`;
        img.alt = co.name;
        img.addEventListener('error', () => { img.style.display = 'none'; btn.prepend(el('span', 'quick-cons-emoji', co.icon)); });
        const badge = el('span', 'quick-cons-badge', `×${owned[co.id]}`);
        const name = el('span', 'quick-cons-name', co.name);
        btn.appendChild(img);
        btn.appendChild(badge);
        btn.appendChild(name);
        btn.addEventListener('click', () => {
          const err = RPG.useConsumable(HERO, co.id);
          if (err) { toast(err); return; }
          persist(); renderHUD();
          toast(`${co.icon} ${co.name} usato! ${co.desc}`);
          setTab('train');
        });
        row.appendChild(btn);
      });
      qp.appendChild(row);
      c.appendChild(qp);
    }
  }

  c.appendChild(el('h2', 'section-title', '⚔️ Registra l\'Impresa'));

  // Daily goal progress bar
  const goalKm = RPG.dailyGoalKm(HERO.level);
  const todayKm = HERO.log.filter(l => {
    const d = new Date(l.date); const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }).reduce((s, l) => s + l.km, 0);
  const goalPct = Math.min(100, Math.round(todayKm / goalKm * 100));
  const goalEl = el('div', 'train-daily-goal');
  goalEl.innerHTML = `<div class="train-goal-label">🎯 Obiettivo di oggi: <b>${todayKm.toFixed(1)} / ${goalKm} km</b>${HERO.restBonus ? ' · ✨ <b style="color:var(--gold-bright)">x2 Riposo attivo!</b>' : ''}</div>
    <div class="train-goal-bar"><div class="train-goal-fill" style="width:${goalPct}%"></div></div>`;
  c.appendChild(goalEl);

  const form = el('div', 'panel');
  form.appendChild(el('label', 'field-label', 'Tipo di attività'));
  const actRow = el('div', 'act-row');
  const ACT_ICON_FILES = { cyclette: 'assets/ui/act-cyclette.png', camminata: 'assets/ui/act-camminata.png', corsa: 'assets/ui/act-corsa.png' };
  const mount = HERO.mount ? RPG.mountById(HERO.mount) : null;
  Object.entries(RPG.ACTIVITIES).forEach(([key, a]) => {
    const b = el('button', 'act-choice' + (key === chosen ? ' selected' : ''));
    const iconHolder = el('div', 'act-icon-holder', a.icon);
    if (ACT_ICON_FILES[key]) {
      const img = el('img', 'act-icon');
      img.src = ACT_ICON_FILES[key];
      img.addEventListener('load', () => { iconHolder.textContent = ''; iconHolder.appendChild(img); });
    }
    b.appendChild(iconHolder);
    b.appendChild(el('span', 'act-label', a.label));
    b.appendChild(el('span', 'act-xp-badge', `${a.xpPerKm} XP/km`));
    if (mount) b.appendChild(el('span', 'act-bonus-badge', `${mount.emoji} +${mount.bonus}% km`));
    b.dataset.key = key;
    b.addEventListener('click', () => {
      chosen = key;
      actRow.querySelectorAll('.act-choice').forEach(x => x.classList.toggle('selected', x.dataset.key === key));
    });
    actRow.appendChild(b);
  });
  form.appendChild(actRow);
  form.appendChild(el('p', 'muted small', '⬆️ Incolla i passi nella striscia sopra — usa il tipo selezionato.'));
  c.appendChild(form);

  // ── L'Arena dei Guerrieri ──
  const left = RPG.battlesLeft(HERO);
  const ap = el('div', 'panel arena-panel');
  ap.appendChild(el('h3', 'panel-title', '⚔️ L\'Arena dei Guerrieri'));
  ap.appendChild(el('p', 'muted small',
    'Sfida un nemico a duello! Scegli tra Fendente, Parata e Incantesimo: vinci <b>3 round su 5</b> e apri un forziere. Puoi combattere <b>5 volte al giorno</b>.'));
  ap.appendChild(el('div', 'arena-tokens', `🎫 Sfide rimaste oggi: <b>${left}</b> / ${RPG.BATTLE_MAX_DAY}`));
  const abtn = el('button', 'btn btn-primary wide big', left > 0 ? '⚔️ ENTRA NELL\'ARENA' : '⏳ Torna domani per nuove sfide');
  abtn.disabled = left < 1;
  abtn.addEventListener('click', openArena);
  ap.appendChild(abtn);

  /* Spedizione a tappe */
  const dungeonAvail = RPG.canStartDungeon(HERO);
  const dp = el('div', 'dungeon-strip' + (dungeonAvail ? '' : ' dungeon-done'));
  dp.innerHTML = `<div class="dungeon-strip-left">
    <span class="dungeon-strip-icon">🗡️</span>
    <div>
      <div class="dungeon-strip-title">Spedizione a Tappe</div>
      <div class="dungeon-strip-sub small muted">${dungeonAvail ? '3 nemici + Boss · Oggetto Epico garantito' : 'Completata per oggi · Torna domani'}</div>
    </div>
  </div>
  <button class="btn${dungeonAvail ? ' btn-primary' : ''} dungeon-strip-btn" id="btn-dungeon-open" ${dungeonAvail ? '' : 'disabled'}>${dungeonAvail ? '▶ Parti' : '✓ Fatto'}</button>`;
  ap.appendChild(dp);
  if (dungeonAvail) {
    dp.querySelector('#btn-dungeon-open').addEventListener('click', openDungeon);
  }
  ap.appendChild(dp);

  /* Extra Boss — Contratto dei Mostri */
  if (HERO.consumableBuffs && HERO.consumableBuffs.extraBoss) {
    const xbp = el('div', 'dungeon-strip extra-boss-strip');
    xbp.innerHTML = `<div class="dungeon-strip-left">
      <span class="dungeon-strip-icon">📋</span>
      <div>
        <div class="dungeon-strip-title">Boss Straordinario <span class="tag tag-boss" style="font-size:.65rem;vertical-align:middle">CONTRATTO</span></div>
        <div class="dungeon-strip-sub small muted">Il Contratto dei Mostri è attivo — sfida un boss extra!</div>
      </div>
    </div>
    <button class="btn btn-primary dungeon-strip-btn" id="btn-extra-boss">▶ Sfida</button>`;
    ap.appendChild(xbp);
    xbp.querySelector('#btn-extra-boss').addEventListener('click', () => {
      const bosses = RPG.BESTIARY.filter(b => b.boss && !b.final);
      const v = bosses[Math.floor(Math.random() * bosses.length)];
      if (!v) { toast('Nessun boss disponibile.'); return; }
      const fig = `<img class="arena-intro-img" src="assets/bestiario/${v.id}.png" onerror="this.style.display='none'">`;
      modal(`<div class="arena-intro">
        <p class="center big-news">📋 Boss Straordinario!</p>
        ${fig}
        <h3 class="panel-title center">${v.name} <span class="tag tag-boss">BOSS</span></h3>
        <p class="center small muted">Debolezza: <b>${v.weakness}</b></p>
        <p class="center small">Il Contratto dei Mostri ti permette di sfidare questo boss fuori calendario. Vinci <b>3 round su 5</b>!</p>
        <button class="btn btn-primary wide big" id="btn-extra-boss-fight">🔥 COMBATTI!</button>
        <button class="btn wide" onclick="closeModal()">Rinuncia al contratto</button>
      </div>`);
      const fb = document.getElementById('btn-extra-boss-fight');
      if (fb) fb.addEventListener('click', () => {
        delete HERO.consumableBuffs.extraBoss;
        persist();
        beginBattle(v.id);
      });
    });
  }

  c.appendChild(ap);

  renderDailyChallenges(c);
}


/* ── Pannello Sincronizzazione Salute ── */
const SHORTCUT_NAME = "Hero's Pace";
const APP_BASE_URL   = 'https://dexcorsaro9-cmyk.github.io/RPGym/';

function renderShortcutPanel() {
  const p = el('div', 'panel shortcut-panel');

  // Titolo
  const titleRow = el('div', 'shortcut-title-row');
  titleRow.innerHTML = `<span class="shortcut-apple-icon">📱</span>
    <div><b>Sincronizzazione Salute</b>
    <div class="small muted">Importa i km direttamente dalla tua app fitness</div></div>`;
  p.appendChild(titleRow);

  // ── Tab iOS / Android ──
  const tabBar = el('div', 'sync-tab-bar');
  const tabIos = el('button', 'sync-tab active', '🍎 iOS');
  const tabAnd = el('button', 'sync-tab', '🤖 Android');
  tabBar.appendChild(tabIos);
  tabBar.appendChild(tabAnd);
  p.appendChild(tabBar);

  // ═══ PANNELLO iOS ═══
  const iosPane = el('div', 'sync-pane');

  const launchBtn = el('button', 'btn shortcut-launch-btn wide');
  launchBtn.innerHTML = `<span class="shortcut-icon">⚡</span> Lancia "Hero's Pace" (già configurato)`;
  launchBtn.addEventListener('click', () => {
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
  });
  iosPane.appendChild(launchBtn);

  const iosGuideToggle = el('button', 'shortcut-manual-toggle');
  iosGuideToggle.innerHTML = '📋 Come configurare il Comando Rapido <span>▼</span>';
  iosPane.appendChild(iosGuideToggle);

  const iosGuideBody = el('div', 'shortcut-manual-body collapsed');
  iosGuideBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Apri <b>Comandi Rapidi</b> → tocca <b>+</b> per creare un nuovo comando.</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Aggiungi <b>"Trova campioni di salute"</b> → tipo: <b>Passi</b> → Data di inizio: <b>è oggi</b>.</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Aggiungi <b>"Calcola statistiche"</b> → <i>Campioni di dati sanitari</i> → funzione: <b>Somma</b>.</div></div>
      <div class="shortcut-step"><span class="step-num">4</span>
        <div>Aggiungi <b>"Copia negli appunti"</b> → input: variabile <b>Somma</b> del passo 3.</div></div>
      <div class="shortcut-step"><span class="step-num">5</span>
        <div>Salva con nome <b>Hero's Pace</b>. Dopo averlo lanciato, apri l'app: incolla nel campo verde ⚡. Fatto!</div></div>
    </div>`;
  const openShortcuts = el('button', 'btn btn-small wide shortcut-open-app');
  openShortcuts.innerHTML = '📱 Apri Comandi Rapidi';
  openShortcuts.addEventListener('click', () => { window.location.href = 'shortcuts://'; });
  iosGuideBody.appendChild(openShortcuts);

  iosGuideToggle.addEventListener('click', () => {
    const open = !iosGuideBody.classList.contains('collapsed');
    iosGuideBody.classList.toggle('collapsed', open);
    iosGuideToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  iosPane.appendChild(iosGuideBody);
  p.appendChild(iosPane);

  // ═══ PANNELLO ANDROID ═══
  const andPane = el('div', 'sync-pane hidden');

  // Metodo manuale
  const andManualToggle = el('button', 'shortcut-manual-toggle');
  andManualToggle.innerHTML = '👆 Metodo 1 — Copia & Incolla (tutti i dispositivi) <span>▼</span>';
  andPane.appendChild(andManualToggle);

  const andManualBody = el('div', 'shortcut-manual-body collapsed');
  andManualBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Apri <b>Google Fit</b>, <b>Samsung Health</b> o qualsiasi app fitness e guarda i passi di oggi.</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Torna su Hero's Pace → schermata <b>Allenati</b>.</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Digita i passi nel campo verde <b>⚡ Passi da Salute</b> e premi <b>Invio</b>. Il gioco calcola i km automaticamente.</div></div>
    </div>`;
  andManualToggle.addEventListener('click', () => {
    const open = !andManualBody.classList.contains('collapsed');
    andManualBody.classList.toggle('collapsed', open);
    andManualToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  andPane.appendChild(andManualBody);

  // Metodo MacroDroid
  const andAutoToggle = el('button', 'shortcut-manual-toggle');
  andAutoToggle.innerHTML = '🤖 Metodo 2 — MacroDroid (automatico, gratis) <span>▼</span>';
  andPane.appendChild(andAutoToggle);

  const andAutoBody = el('div', 'shortcut-manual-body collapsed');
  andAutoBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Installa <b>MacroDroid</b> dal Play Store (gratuita).</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Crea una nuova <b>Macro</b>: Trigger → <b>Ora del giorno</b> (es. ogni sera alle 21:00).</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Azione → <b>Variabile</b> → leggi passi da <b>Health Connect</b> di oggi → salva in variabile <code>passi</code>.</div></div>
      <div class="shortcut-step"><span class="step-num">4</span>
        <div>Azione → <b>Apri URL</b>:<br><code style="font-size:.75rem;word-break:break-all">${APP_BASE_URL}?sync_steps=[passi]</code></div></div>
      <div class="shortcut-step"><span class="step-num">5</span>
        <div>Salva la macro. Ogni sera alle 21 aprirà l'app e sincronizzerà i passi automaticamente.</div></div>
    </div>`;
  andAutoToggle.addEventListener('click', () => {
    const open = !andAutoBody.classList.contains('collapsed');
    andAutoBody.classList.toggle('collapsed', open);
    andAutoToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  andPane.appendChild(andAutoBody);

  // Metodo Tasker
  const andTaskerToggle = el('button', 'shortcut-manual-toggle');
  andTaskerToggle.innerHTML = '⚙️ Metodo 3 — Tasker (avanzato, ~3€) <span>▼</span>';
  andPane.appendChild(andTaskerToggle);

  const andTaskerBody = el('div', 'shortcut-manual-body collapsed');
  andTaskerBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Installa <b>Tasker</b> dal Play Store.</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Crea un nuovo <b>Task</b>: Azione → <b>Health Connect</b> → Leggi <b>Passi</b> di oggi → salva in <code>%passi</code>.</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Aggiungi azione <b>"Apri URL"</b>:<br><code style="font-size:.75rem;word-break:break-all">${APP_BASE_URL}?sync_steps=%passi</code></div></div>
      <div class="shortcut-step"><span class="step-num">4</span>
        <div>Crea un <b>Profilo</b> con trigger orario (es. 21:00) e collega il task. Oppure aggiungi un <b>widget</b> sul desktop per lanciarlo manualmente.</div></div>
    </div>`;
  andTaskerToggle.addEventListener('click', () => {
    const open = !andTaskerBody.classList.contains('collapsed');
    andTaskerBody.classList.toggle('collapsed', open);
    andTaskerToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  andPane.appendChild(andTaskerBody);
  p.appendChild(andPane);

  // ── Logica tab switch ──
  tabIos.addEventListener('click', () => {
    tabIos.classList.add('active'); tabAnd.classList.remove('active');
    iosPane.classList.remove('hidden'); andPane.classList.add('hidden');
  });
  tabAnd.addEventListener('click', () => {
    tabAnd.classList.add('active'); tabIos.classList.remove('active');
    andPane.classList.remove('hidden'); iosPane.classList.add('hidden');
  });

  return p;
}

/* ── Report post-allenamento (con scrigno per le missioni) ── */
let PENDING_CHEST = null;

function itemIconHtml(it, cls) {
  const img = RPG.itemImg(it);
  return img
    ? `<img class="${cls || 'item-icon'}" src="${img}" onerror="this.outerHTML='${it.icon}'" alt="">`
    : it.icon;
}

function itemHtml(it) {
  return `<div class="loot rar-${it.rarity} loot-with-img">
    ${itemIconHtml(it, 'item-icon-big')}
    <div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span>${it.distilled ? ' <span class="tag tag-distilled">⚗️ Distillato!</span>' : ''}</div>
      <div class="small muted">${it.desc}</div>
      <div class="small">📈 +${it.xp}% XP equipaggiato · 🪙 valore ${it.value}</div>
    </div>
  </div>`;
}

function showLevelUp(newLevel) {
  vibrate([100, 50, 100]);
  const col = AVATAR_COLORS[HERO.storyId] || { glow: '#c9932e' };
  const glowColor = col.glow;
  const talent = RPG.talentOf(HERO);

  const ov = document.createElement('div');
  ov.className = 'lup-overlay';
  ov.style.setProperty('--lup-glow', glowColor);

  // Rings with class color
  for (let i = 0; i < 3; i++) {
    const r = document.createElement('div');
    r.className = 'lup-ring';
    ov.appendChild(r);
  }

  // Particles — più numerose e con colore classe
  Array.from({ length: 28 }, (_, i) => i * (360 / 28)).forEach((deg, i) => {
    const p = document.createElement('div');
    p.className = 'lup-particle';
    const rad = deg * Math.PI / 180;
    const dist = 110 + Math.random() * 130;
    p.style.setProperty('--tx', Math.cos(rad) * dist + 'px');
    p.style.setProperty('--ty', Math.sin(rad) * dist + 'px');
    p.style.setProperty('--dur', (.8 + Math.random() * .7) + 's');
    p.style.setProperty('--delay', (Math.random() * .3) + 's');
    p.style.setProperty('--pc', i % 3 === 0 ? '#fff' : i % 3 === 1 ? glowColor : '#f07030');
    ov.appendChild(p);
  });

  // Avatar eroe
  if (HERO.avatar && HERO.avatar.startsWith('assets/')) {
    const avWrap = document.createElement('div');
    avWrap.className = 'lup-avatar';
    const avImg = document.createElement('img');
    avImg.src = HERO.avatar;
    avImg.className = 'lup-avatar-img';
    avWrap.appendChild(avImg);
    ov.appendChild(avWrap);
  }

  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-badge', textContent: '✦ Livello raggiunto ✦' }));
  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-level', textContent: newLevel }));
  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-title-text', textContent: RPG.heroTitle(newLevel) }));
  if (talent) {
    const td = document.createElement('div');
    td.className = 'lup-talent';
    td.textContent = `${talent.icon} ${talent.name}`;
    ov.appendChild(td);
  }
  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-tap', textContent: '· tocca per continuare ·' }));

  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('lup-visible'));
  const dismiss = () => { ov.classList.add('lup-exit'); setTimeout(() => ov.remove(), 500); };
  const tid = setTimeout(dismiss, 3800);
  ov.addEventListener('click', () => { clearTimeout(tid); dismiss(); });
}


function showReport(r) {
  const a = RPG.ACTIVITIES[r.type];
  const xpNeed = RPG.xpForLevel(HERO.level);
  const xpPct = Math.min(100, Math.round(HERO.xp / xpNeed * 100));
  const leveled = r.levelsGained.length > 0;
  const newLevel = leveled ? r.levelsGained[r.levelsGained.length - 1] : HERO.level;

  // Rileva cambio bioma e prepara pergamena lore
  let pendingBiomeLore = null;
  if (leveled) {
    // i min level di ogni bioma (indice 0 = lv1, ma il bioma 0 non mostra pergamena)
    const BIOME_MINS = [1,5,11,16,21,26,31,36,41,46,51,56,61,66,71,76,81,86,91,95];
    r.levelsGained.forEach(lv => {
      const biomeIdx = BIOME_MINS.indexOf(lv);
      if (biomeIdx > 0 && !(HERO.biomesDiscovered || []).includes(biomeIdx)) {
        const biome = RPG.currentBiome(lv);
        pendingBiomeLore = { biomeIdx, biome, lore: RPG.BIOME_LORE[biomeIdx] };
        HERO.biomesDiscovered = HERO.biomesDiscovered || [];
        HERO.biomesDiscovered.push(biomeIdx);
        persist();
      }
    });
  }

  let html = `<div class="report-header">
    <div class="report-act-icon">${a.icon}</div>
    <div class="report-km-big">${r.km} km</div>
    <div class="report-act-label">${a.label}${r.restBonusUsed ? ' · <b class="report-bonus">x2 Riposo!</b>' : ''}</div>
  </div>`;

  html += `<div class="report-xp-wrap">
    <div class="report-xp-label">⭐ Esperienza · Liv. ${newLevel} — ${RPG.heroTitle(newLevel)}</div>
    <div class="report-xp-track">
      <div class="report-xp-fill" id="rpt-xp-fill"></div>
      <div class="report-xp-text"><span id="rpt-xp-num">0</span> / ${xpNeed} XP</div>
    </div>
  </div>`;

  html += `<div class="report-rewards">
    <div class="rpt-reward star"><span class="rpt-rew-val">+${r.xp}</span><span class="rpt-rew-label">XP</span></div>
    <div class="rpt-reward gold"><span class="rpt-rew-val">+${r.gold}</span><span class="rpt-rew-label">🪙</span></div>
    <div class="rpt-reward wood"><span class="rpt-rew-val">+${r.wood}</span><span class="rpt-rew-label">🪵</span></div>
    <div class="rpt-reward stone"><span class="rpt-rew-val">+${r.stone}</span><span class="rpt-rew-label">🪨</span></div>
  </div>`;

  if (r.streakBonus)
    html += `<p class="report-streak-line">🔥 Streak <b>${HERO.streak.count} giorni</b> · <b>+${Math.round(r.streakBonus * 100)}% XP</b></p>`;
  if (r.weatherBonus)
    html += `<p class="report-streak-line">${r.weatherBonus.icon} ${r.weatherBonus.label} · <b>+${Math.round(r.weatherBonus.xpBonus * 100)}% XP</b></p>`;
  if (r.treasureUnlocked && r.treasureUnlocked.length)
    html += r.treasureUnlocked.map(t => `<p class="big-news small">🗺️ Tappa ${t.idx+1} sbloccata! Riscuoti al Rifugio.</p>`).join('');
  if (r.trophies && r.trophies.length) {
    r.trophies.forEach(t => {
      html += `<div class="trophy-unlock"><span class="trophy-unlock-icon">${t.icon}</span><div><b>Trofeo sbloccato: ${t.name}</b><br><span class="small muted">${t.desc}</span></div></div>`;
    });
    vibrate([200, 100, 200]);
  }
  if (r.bossProgress) {
    const bp = r.bossProgress;
    const bpct = Math.min(100, Math.round(bp.done / bp.total * 100));
    html += `<p class="boss-progress-line">${bp.boss.icon} <b>${esc(bp.boss.name)}</b> — ${bp.done.toFixed(1)} / ${bp.total} km (${bpct}%)</p>`;
  }
  if (r.bossDefeatedWeekly) {
    html += `<div class="big-news">⚔️ BOSS SCONFITTO: ${r.bossDefeatedWeekly.icon} ${esc(r.bossDefeatedWeekly.name)}!<br><span class="small">Torna al Rifugio per riscuotere il bottino.</span></div>`;
  }
  if (r.potionUsed) {
    const pot = RPG.DAILY_POTIONS.find(p => p.id === r.potionUsed);
    if (pot) html += `<p class="report-streak-line">${pot.icon} Pozione usata: <b>${esc(pot.name)}</b></p>`;
  }
  if (r.loreUnlocked && r.loreUnlocked.length) {
    r.loreUnlocked.forEach(f => {
      html += `<div class="lore-unlock"><span class="lore-unlock-icon">📖</span><b>${esc(f.title)}</b><br><span class="small muted">Leggi nel tab Eroe → Cronache di Oakhaven</span></div>`;
    });
  }
  if (leveled) {
    const ptsNow = HERO.skillPoints || 0;
    html += `<div class="report-levelup">🆙 LIVELLO ${newLevel}!<br><span class="small">${RPG.heroTitle(newLevel)}</span>${ptsNow > 0 ? `<br><span class="small">🌟 +1 punto abilità disponibile!</span>` : ''}</div>`;
    setTimeout(() => showLevelUp(newLevel), 350);
  }
  if (r.capReached)
    html += `<p class="muted small">🔒 Livello 20 raggiunto: per l'Ascensione serve l'<b>Amuleto del Viaggiatore Esperto</b> (guarda la Mappa).</p>`;
  if (r.loot.length) {
    html += `<h4>🎒 Sacchi del Viaggiatore:</h4><div class="loot-list">`;
    r.loot.forEach(it => { html += itemHtml(it); });
    html += `</div>`;
  }
  if (r.tickets && r.tickets.length)
    html += `<p>🎟️ Hai trovato <b>${r.tickets.length} Biglietto${r.tickets.length > 1 ? ' Gratta e Vinci' : ' Gratta e Vinci'}</b>! Aprilo dalla tua Sacca.</p>`;
  if (r.fragments)
    html += `<p>🔍 Hai trovato <b>${r.fragments} Frammento/i di Memoria</b>!</p>`;
  if (r.sighting) {
    html += `<div class="sighting">
      <img class="sighting-img" src="assets/bestiario/${r.sighting.id}.png" alt="">
      <div><b>👁️ Avvistamento!</b><br>${r.sighting.name}<br>
      <span class="small muted">Aggiunto al Bestiario</span></div>
    </div>`;
  }
  if (r.finalReveal)
    html += `<p class="big-news">🐉 LE MEMORIE SONO COMPLETE!<br><span class="small">Il Cavaliere del Drago è nel Bestiario.</span></p>`;
  if (r.incursionProgress) {
    const ip = r.incursionProgress;
    html += `<p>⚡ Incursione: ${ip.done.toFixed(1)} / ${ip.km} km — resisti fino a mezzanotte!</p>`;
  }
  if (r.incursionComplete) {
    html += `<p class="big-news">⚡ INCURSIONE RESPINTA!</p>`;
    PENDING_CHEST = { title: r.incursionComplete.name, chest: r.incursionComplete.chest };
  }
  if (r.mappaInfuocataProgress) {
    const mi = r.mappaInfuocataProgress;
    html += `<p>🗺️ Mappa Infuocata: ${mi.kmDone.toFixed(1)} / 10 km — continua!</p>`;
  }
  if (r.mappaInfuocataReady) {
    html += `<p class="big-news">🗺️ MAPPA INFUOCATA COMPLETATA! Reclama il tuo bottino nella Mappa.</p>`;
  }
  if (r.missionProgress) {
    const mp = r.missionProgress;
    html += `<p>🐎 Missione <b>${mp.mission.name}</b>: ${mp.done.toFixed(1)} / ${mp.mission.km} km.</p>`;
  }
  if (r.missionComplete) {
    html += `<p class="big-news">🏆 MISSIONE COMPLETATA: ${r.missionComplete.name}!</p>`;
    if (r.bossDefeated) {
      html += `<div class="sighting boss-defeated">
        <img class="sighting-img" src="assets/bestiario/${r.bossDefeated.id}.png" alt="">
        <div><b>⚔️ BOSS SCONFITTO!</b><br>${r.bossDefeated.name}<br>
        <span class="small muted">Aggiunto al Bestiario</span></div>
      </div>`;
    }
    PENDING_CHEST = PENDING_CHEST || { title: r.missionComplete.name, chest: r.chest, cards: r.cards };
  }
  r.unlocks.forEach(u => { html += `<p class="big-news small">${u}</p>`; });

  if (PENDING_CHEST) {
    html += `<div class="chest-zone">
      <p class="center"><b>Un forziere ti attende!</b></p>
      <button class="chest-btn" id="btn-open-chest"><img src="assets/ui/chest.svg" alt="scrigno"></button>
      <p class="small muted center">Tocca lo scrigno per aprirlo</p>
    </div>`;
  }
  if (navigator.share) {
    html += `<button class="btn wide" id="btn-share-rpt">📤 Condividi risultato</button>`;
  }
  if (pendingBiomeLore) {
    html += `<button class="btn btn-primary wide" id="btn-report-close">📜 Continua il Viaggio</button>`;
  } else {
    html += `<button class="btn btn-primary wide" id="btn-report-close">Torna al Rifugio</button>`;
  }
  modal(html);

  // Aggancia il bottone chiudi dopo il render del modal
  setTimeout(() => {
    const btn = $('#btn-report-close');
    if (!btn) return;
    btn.addEventListener('click', () => {
      closeModal();
      nextOpening(); renderHUD(); setTab('camp');
      checkAndQueueLetters();
      if (pendingBiomeLore) {
        setTimeout(() => showBiomeParchment(pendingBiomeLore), 300);
      }
    });
  }, 50);

  // Animate XP bar
  const fill = $('#rpt-xp-fill');
  const numEl = $('#rpt-xp-num');
  if (fill && numEl) {
    const targetPct = xpPct;
    const targetXp = HERO.xp;
    setTimeout(() => {
      fill.style.width = targetPct + '%';
      const dur = 900;
      const start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / dur);
        const ease = 1 - Math.pow(1 - t, 3);
        numEl.textContent = Math.round(ease * targetXp);
        if (t < 1) requestAnimationFrame(tick);
        else numEl.textContent = targetXp;
      };
      requestAnimationFrame(tick);
    }, 120);
  }

  const chestBtn = $('#btn-open-chest');
  if (chestBtn) chestBtn.addEventListener('click', openChest);

  const shareBtn = $('#btn-share-rpt');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const streakTxt = HERO.streak.count > 1 ? ` 🔥 Streak ${HERO.streak.count} giorni!` : '';
      navigator.share({
        title: "Hero's Pace ⚔️",
        text: `Ho fatto ${r.km} km di ${a.label} e guadagnato +${r.xp} XP!${streakTxt} Lv.${newLevel} — ${RPG.heroTitle(newLevel)}`,
      }).catch(() => {});
    });
  }
}

function showBiomeParchment({ biome, biomeIdx, lore }) {
  const artifact = RPG.BIOME_ARTIFACTS[biomeIdx] || null;
  const artifactHtml = artifact ? `
    <div class="biome-parchment-artifact">
      <span class="bpa-icon">${artifact.icon}</span>
      <div class="bpa-text">
        <div class="bpa-label">Reliquia trovata</div>
        <div class="bpa-name">${esc(artifact.name)}</div>
        <div class="bpa-flavor">${esc(artifact.flavor)}</div>
      </div>
    </div>` : '';
  const ov = document.createElement('div');
  ov.className = 'biome-parchment-overlay';
  ov.innerHTML = `
    <div class="biome-parchment-scroll">
      <div class="biome-parchment-top-ornament">❧</div>
      <div class="biome-parchment-biome-icon">${biome.icon}</div>
      <div class="biome-parchment-subtitle">Nuovo territorio svelato</div>
      <h2 class="biome-parchment-name">${esc(biome.name)}</h2>
      <div class="biome-parchment-divider"></div>
      <div class="biome-parchment-chapter">${esc(lore.title)}</div>
      <p class="biome-parchment-text">${esc(lore.text)}</p>
      ${artifactHtml}
      <div class="biome-parchment-divider"></div>
      <button class="btn btn-primary biome-parchment-btn">Continua il Viaggio →</button>
      <div class="biome-parchment-bottom-ornament">❧</div>
    </div>`;
  document.body.appendChild(ov);
  sfx('level');
  requestAnimationFrame(() => ov.classList.add('biome-parchment-visible'));
  const dismiss = () => {
    ov.classList.add('biome-parchment-exit');
    setTimeout(() => ov.remove(), 500);
  };
  ov.querySelector('.biome-parchment-btn').addEventListener('click', dismiss);
}

function showWorldLetter(letter) {
  if (!letter) return;
  HERO.lettersReceived = HERO.lettersReceived || [];
  if (!HERO.lettersReceived.includes(letter.id)) {
    HERO.lettersReceived.push(letter.id);
    persist();
  }
  const bodyHtml = esc(letter.body).replace(/\n/g, '<br>');
  const ov = document.createElement('div');
  ov.className = 'world-letter-overlay';
  ov.innerHTML = `
    <div class="world-letter-card">
      <div class="wl-seal">${letter.icon}</div>
      <div class="wl-from">
        <span class="wl-sender">${esc(letter.sender)}</span>
        <span class="wl-role">${esc(letter.role)}</span>
      </div>
      <div class="wl-divider"></div>
      <h3 class="wl-title">${esc(letter.title)}</h3>
      <p class="wl-body">${bodyHtml}</p>
      <div class="wl-divider"></div>
      <button class="btn btn-primary wl-btn">Chiudi la lettera</button>
    </div>`;
  document.body.appendChild(ov);
  sfx('item');
  requestAnimationFrame(() => ov.classList.add('world-letter-visible'));
  ov.querySelector('.wl-btn').addEventListener('click', () => {
    ov.classList.add('world-letter-exit');
    setTimeout(() => ov.remove(), 400);
  });
}

function checkAndQueueLetters() {
  const pending = RPG.checkPendingLetters(HERO);
  pending.forEach(letter => {
    OPEN_QUEUE.push(() => showWorldLetter(letter));
  });
  if (pending.length && document.getElementById('modal').classList.contains('hidden')) {
    nextOpening();
  }
}

function openChest() {
  if (!PENDING_CHEST) return;
  const { title, chest } = PENDING_CHEST;
  PENDING_CHEST = null;
  vibrate([80, 60, 80, 60, 200]);
  const btn = $('#btn-open-chest');
  if (btn) {
    btn.classList.add('opening');
    setTimeout(() => {
      btn.classList.add('cracking');
      setTimeout(() => revealChest(title, chest), 360);
    }, 680);
  } else {
    revealChest(title, chest);
  }
}

function revealChest(title, chest) {
  vibrate(300);
  sfx('chest');
  RPG.updateWeeklyProgress(HERO, 'chest', 1);
  const parts = [];
  if (chest.gold) parts.push(`<div class="chest-res-chip gold">🪙 ${chest.gold}</div>`);
  if (chest.wood) parts.push(`<div class="chest-res-chip wood">🪵 ${chest.wood}</div>`);
  if (chest.stone) parts.push(`<div class="chest-res-chip stone">🪨 ${chest.stone}</div>`);
  let html = `<div class="chest-reveal-header">
    <div class="chest-burst-ring"></div>
    <h3 class="chest-reveal-title">🎁 "${esc(title)}"</h3>
  </div>`;
  if (parts.length) html += `<div class="chest-res-row">${parts.join('')}</div>`;
  html += `<div class="chest-loot-list">`;
  (chest.items || []).forEach((it, i) => {
    html += `<div class="loot-stagger" style="--di:${i}">${itemHtml(it)}</div>`;
  });
  let cardIdx = (chest.items || []).length;
  (chest.cards || []).forEach(cid => {
    const card = RPG.CARDS[cid];
    html += `<div class="loot-stagger" style="--di:${cardIdx++}"><div class="card-reveal rar-${card.rarity}">
      <div class="card-icon">${card.icon}</div>
      <b>${card.name}</b><br><span class="tag">${card.rarity}</span>
      <p class="small lore">${card.lore}</p>
    </div></div>`;
  });
  html += `</div>`;
  if (chest.ticket) {
    const tCfg = RPG.TICKET_TYPES[chest.ticket];
    html += `<div class="panel" style="margin-top:10px;text-align:center;background:rgba(180,140,20,0.08);border:1px solid rgba(200,160,30,0.25)">
      🎟️ <b>Biglietto ${esc(tCfg.name)} trovato!</b><br>
      <span class="muted small">Aprilo dalla tua Sacca → Biglietti</span>
    </div>`;
  }
  html += `<p class="small muted center" style="margin-top:12px">Gli oggetti sono nel tuo zaino: equipaggiali dal menu Eroe o vendili al Mercato.</p>
    <button class="btn btn-primary wide" onclick="closeModal(); setTab('hero')">Vai all'Equipaggiamento</button>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
}

/* ── TAB: Mercato ── */
let MARKET_VIEW = 'hub';
let NERO_FILTER = 'all';

function renderMarket(c) {
  if (MARKET_VIEW === 'taverna')   { renderTavernaView(c);   return; }
  if (MARKET_VIEW === 'bisca')     { renderBiscaView(c);     return; }
  if (MARKET_VIEW === 'stalla')    { renderStallaView(c);    return; }
  if (MARKET_VIEW === 'nero')      { renderNeroView(c);      return; }
  if (MARKET_VIEW === 'fucina')    { renderFucinaView(c);    return; }
  if (MARKET_VIEW === 'erborista') { renderErboristaView(c); return; }

  const marketTitle = el('h2', 'section-title', '🏘️ Il Borgo');
  c.appendChild(marketTitle);
  const marketIcon = new Image();
  marketIcon.onload = () => { marketTitle.innerHTML = `<img class="title-icon" src="assets/ui/tab-mercato.png"> Il Borgo`; };
  marketIcon.src = 'assets/ui/tab-mercato.png';

  // ── Mercante Fuggiasco ──
  const fm = RPG.getFugitiveMerchant(HERO);
  if (fm) {
    const kmToday = RPG.todayKm(HERO);
    const kmLeft = Math.max(0, fm.kmRequired - kmToday);
    const reached = kmLeft <= 0;
    const fp = el('div', 'panel panel-featured fugitive-merchant-panel');
    fp.innerHTML = `
      <h3 class="panel-title">🏃 Mercante Fuggiasco!</h3>
      <div class="fm-subtitle">Sparisce a mezzanotte · <b class="cd-hot"><span data-cd="midnight">…</span></b></div>
      <div class="fm-item">${itemHtml(fm.item)}</div>
      <div class="fm-prices">
        <span class="fm-price-full">🪙 ${fm.fullPrice}</span>
        <span class="fm-price-sale">🪙 ${fm.price}</span>
        <span class="fm-discount">–80%</span>
      </div>`;
    if (fm.bought) {
      fp.appendChild(el('div', 'done-strip', `✅ <b>Acquistato!</b> Il mercante è stato raggiunto.`));
    } else if (reached) {
      const buyBtn = el('button', 'btn btn-primary wide', `🤝 Acquista · 🪙 ${fm.price}`);
      buyBtn.disabled = HERO.gold < fm.price;
      buyBtn.addEventListener('click', () => {
        const err = RPG.buyFromFugitiveMerchant(HERO);
        if (err) { toast(err); return; }
        persist(); renderHUD();
        vibrate([120, 40, 180]);
        sfx('coin');
        modal(`<h3 class="panel-title">🤝 Affare Concluso!</h3>
          <p class="center">Hai raggiunto il mercante fuggiasco a tempo!</p>
          <div class="loot-list" style="margin:.5rem 0">${itemHtml(fm.item)}</div>
          <button class="btn btn-primary wide" onclick="closeModal();setTab('market')">Ottimo!</button>`);
        setTab('market');
      });
      fp.appendChild(buyBtn);
    } else {
      const prog = el('div', 'membar');
      prog.innerHTML = `<div class="membar-fill gold" style="width:${Math.min(100, Math.round(kmToday / fm.kmRequired * 100))}%"></div><span>${kmToday.toFixed(1)} / ${fm.kmRequired} km</span>`;
      fp.appendChild(prog);
      fp.appendChild(el('p', 'muted small center', `Percorri ancora <b>${kmLeft.toFixed(1)} km</b> oggi per raggiungerlo!`));
    }
    c.appendChild(fp);
  }

  // ── 4 sezioni del Borgo come pannelli di entrata ──
  const borgoSections = [
    { key: 'stalla',    emoji: '🐴', title: 'La Stalla',             quote: '«La tua cavalcatura ti porta lontano — trattala bene e moltiplicherà ogni tuo passo.»',    img: 'assets/ui/borgo/stalla-header.jpg',       btn: '🐴 Entra nella Stalla' },
    { key: 'nero',      emoji: '🕯️', title: 'Il Mercato Nero',       quote: '«Nessuna domanda, nessun registro. Solo oro che cambia mano nel buio.»',                    img: 'assets/ui/borgo/contrabbando-header.jpg', btn: '🕯️ Entra nel Mercato Nero' },
    { key: 'fucina',    emoji: '⚒️', title: 'La Fucina',             quote: '«Batto il ferro dall\'alba. Portami il tuo pezzo peggiore: te lo riforgio meglio di prima.»', img: 'assets/ui/borgo/fucina-header.jpg',        btn: '⚒️ Entra nella Fucina' },
    { key: 'erborista', emoji: '🌿', title: 'L\'Erborista',          quote: '«Ogni seme vuole germogliare. Ogni eroe ha bisogno di carburante.»',                        img: 'assets/ui/borgo/erborista-header.jpg',    btn: '🌿 Entra dall\'Erborista' },
  ];
  borgoSections.forEach(({ key, emoji, title, quote, img, btn }) => {
    const panel = el('div', 'panel borgo-entry-panel');
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.alt = '';
    thumb.className = 'borgo-entry-header';
    thumb.onerror = () => thumb.remove();
    panel.appendChild(thumb);
    panel.appendChild(el('h3', 'panel-title', `${emoji} ${title}`));
    panel.appendChild(el('p', 'muted small borgo-entry-quote', quote));
    const enterBtn = el('button', 'btn btn-primary wide', btn);
    enterBtn.addEventListener('click', () => { MARKET_VIEW = key; setTab('market'); });
    panel.appendChild(enterBtn);
    c.appendChild(panel);
  });

  // ── La Taverna delle Sfide ──
  const tavernaEntry = el('div', 'panel taverna-entry-panel');
  const tavernaThumb = document.createElement('img');
  tavernaThumb.src = 'assets/ui/taverna-header.jpg';
  tavernaThumb.alt = '';
  tavernaThumb.className = 'camp-panel-thumb';
  tavernaThumb.onerror = () => tavernaThumb.remove();
  tavernaEntry.appendChild(tavernaThumb);
  tavernaEntry.appendChild(el('h3', 'panel-title', '🍺 La Taverna delle Sfide'));
  tavernaEntry.appendChild(el('p', 'muted small taverna-entry-quote',
    '«Tra dadi truccati e boccali volanti, qui si separa chi ha nervi saldi da chi torna a casa vuoto.»'));
  const totalRemMkt = MG_CATEGORIES.flatMap(cat => cat.games).reduce((s, g) => s + Math.max(0, MG_MAX[g.id] - getMG(g.id).n), 0);
  if (totalRemMkt > 0) {
    tavernaEntry.appendChild(el('div', 'taverna-avail-badge', `🎮 ${totalRemMkt} partite disponibili`));
  }
  const enterTavernaBtn = el('button', 'btn btn-primary wide', '🍺 Entra nella Taverna');
  enterTavernaBtn.addEventListener('click', () => { MARKET_VIEW = 'taverna'; setTab('market'); });
  tavernaEntry.appendChild(enterTavernaBtn);
  c.appendChild(tavernaEntry);

  // ── La Bisca Oscura ──
  const biscaEntry = el('div', 'panel bisca-entry-panel');
  biscaEntry.appendChild(el('h3', 'panel-title', '🃏 La Bisca Oscura'));
  biscaEntry.appendChild(el('p', 'muted small bisca-entry-quote',
    '«Nessuno sa chi organizza gli scontri. Nessuno chiede. Le monete parlano per tutti.»'));
  RPG.biscaResetIfNeeded(HERO);
  const biscaBetsLeft = (HERO.bisca && HERO.bisca.betsLeft !== undefined) ? HERO.bisca.betsLeft : RPG.BISCA_DAILY_BETS;
  if (biscaBetsLeft > 0) {
    biscaEntry.appendChild(el('div', 'bisca-avail-badge', `🎰 ${biscaBetsLeft} scommesse disponibili`));
  } else {
    biscaEntry.appendChild(el('div', 'bisca-avail-badge bisca-exhausted', '⛔ Scommesse esaurite per oggi'));
  }
  const enterBiscaBtn = el('button', 'btn btn-primary wide', '🃏 Entra nella Bisca');
  enterBiscaBtn.addEventListener('click', () => { MARKET_VIEW = 'bisca'; setTab('market'); });
  biscaEntry.appendChild(enterBiscaBtn);
  c.appendChild(biscaEntry);
}

function npcBanner(imgPath, name, quote) {
  const b = el('div', 'npc-banner');
  const img = el('img', 'npc-img');
  img.loading = 'eager';
  img.src = imgPath;
  img.addEventListener('error', () => img.remove());
  b.appendChild(img);
  b.appendChild(el('div', 'npc-quote', `<b>${name}</b><br><span class="small">${quote}</span>`));
  return b;
}

function _borgoSubView(c, headerSrc, title, renderFn) {
  const backBtn = el('button', 'view-back-link', '‹ Il Borgo');
  backBtn.addEventListener('click', () => { MARKET_VIEW = 'hub'; setTab('market'); });
  c.appendChild(backBtn);
  const hImg = document.createElement('img');
  hImg.src = headerSrc;
  hImg.alt = '';
  hImg.className = 'borgo-sub-header';
  hImg.onerror = () => hImg.remove();
  c.appendChild(hImg);
  c.appendChild(el('h2', 'section-title', title));
  renderFn(c);
}

function renderStallaView(c)    { _borgoSubView(c, 'assets/ui/borgo/stalla-header.jpg',        '🐴 La Stalla',        renderStalla); }
function renderNeroView(c)      { _borgoSubView(c, 'assets/ui/borgo/contrabbando-header.jpg',   '🕯️ Il Mercato Nero',  renderNero); }
function renderFucinaView(c)    { _borgoSubView(c, 'assets/ui/borgo/fucina-header.jpg',         '⚒️ La Fucina',        renderFucina); }
function renderErboristaView(c) { _borgoSubView(c, 'assets/ui/borgo/erborista-header.jpg',      '🌿 L\'Erborista',     renderErborista); }

function renderStalla(c) {
  c.appendChild(el('p', 'muted small center',
    'Le cavalcature aumentano i km "virtuali" di ogni allenamento. Una nuova compagna di viaggio ogni 5 livelli: tocca una miniatura per conoscere la sua storia…'));
  const grid = el('div', 'mount-grid');
  RPG.MOUNTS.forEach(m => {
    const owned = HERO.mountsOwned.includes(m.id);
    const active = HERO.mount === m.id;
    const locked = HERO.level < m.level;
    const card = el('div', 'mount-card' + (locked ? ' locked' : '') + (active ? ' active-mount' : ''));
    const img = el('img', 'mount-thumb');
    img.src = m.img;
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.outerHTML = `<div class="mount-emoji-big">${m.emoji}</div>`; });
    card.appendChild(img);
    card.appendChild(el('div', 'mount-name', m.name));
    card.appendChild(el('div', 'mount-req small',
      (active ? '✅ In sella' : locked ? `🔒 Liv. ${m.level}` : owned ? 'Nella stalla' : `🪙 ${m.price}`) +
      ` · +${m.bonus}% km`));
    card.addEventListener('click', () => showMountSheet(m));
    grid.appendChild(card);
  });
  c.appendChild(grid);
}

function showMountSheet(m) {
  const owned = HERO.mountsOwned.includes(m.id);
  const active = HERO.mount === m.id;
  const locked = HERO.level < m.level;
  let action = '';
  if (active) action = `<p class="center big-news small">✅ È la tua cavalcatura attuale</p>`;
  else if (locked) action = `<p class="center muted">🔒 Si sblocca al <b>Livello ${m.level}</b> (sei al ${HERO.level}). Continua ad allenarti: ti sta aspettando…</p>`;
  else action = `<button class="btn btn-primary wide" id="btn-mount-buy">${owned ? '🐎 Sella!' : `🪙 Compra per ${m.price}`}</button>`;
  modal(`
    <div class="mount-sheet">
      <img class="mount-sheet-img${locked ? ' mount-locked-img' : ''}" src="${m.img}" onerror="this.outerHTML='<div class=&quot;mount-emoji-big&quot;>${m.emoji}</div>'">
      <h3 class="panel-title center">${m.name}</h3>
      <p class="center small"><span class="tag">Liv. ${m.level}</span> <span class="tag">+${m.bonus}% km</span> <span class="tag">🪙 ${m.price}</span></p>
      <div class="mount-bio">${esc(m.bio)}</div>
      ${action}
      <button class="btn wide" onclick="closeModal()">Torna alla Stalla</button>
    </div>
  `);
  const buy = $('#btn-mount-buy');
  if (buy) buy.addEventListener('click', () => {
    const err = RPG.buyMount(HERO, m.id);
    persist(); renderHUD();
    toast(err || `${m.emoji} ${m.name} è ora la tua cavalcatura! (+${m.bonus}% km)`);
    if (!err) vibrate(100);
    closeModal();
    setTab('market');
  });
}

function showItemPreview(it) {
  const sv = RPG.sellValue(HERO, it);
  const warn = it.rarity === 'leggendario' || it.rarity === 'epico'
    ? `<span class="item-preview-warn">⚠️ Oggetto ${RPG.RARITIES[it.rarity].label} — sicuro di venderlo?</span>` : '';
  modal(`
    ${itemHtml(it)}
    <div class="item-preview-val">Ricavi: 🪙 ${sv} monete ${warn}</div>
    <div class="row gap">
      <button class="btn wide" onclick="closeModal()">Annulla</button>
      <button class="btn wide btn-primary" id="btn-confirm-sell">Vendi 🪙${sv}</button>
    </div>
  `);
  $('#btn-confirm-sell').addEventListener('click', () => {
    RPG.sellItem(HERO, it.id);
    persist(); renderHUD();
    vibrate(60);
    toast(`🪙 +${sv} monete!`);
    closeModal();
    setTab('market');
  });
}

function renderNero(c) {
  c.appendChild(npcBanner('assets/avatars/npc/mercante-contrabbando.png', 'Messer Bilancia',
    '«Ogni oggetto ha il suo giusto peso in monete… la mia bilancia non sbaglia mai. Vendimi pure, qui non si fanno domande.»'));
  const sellable = HERO.items.filter(i => !Object.values(HERO.equipment).includes(i.id));
  if (!sellable.length) {
    c.appendChild(emptyState('💼', 'Non hai bottini da vendere. Gli oggetti equipaggiati non si toccano!'));
    return;
  }
  // Filtri per rarità
  const rarityOrder = Object.keys(RPG.RARITIES);
  const presentRarities = [...new Set(sellable.map(i => i.rarity))]
    .sort((a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b));
  if (presentRarities.length > 1) {
    if (!presentRarities.includes(NERO_FILTER) && NERO_FILTER !== 'all') NERO_FILTER = 'all';
    const filterRow = el('div', 'nero-filters');
    [['all', `Tutti (${sellable.length})`], ...presentRarities.map(r => [r, RPG.RARITIES[r].label])].forEach(([key, label]) => {
      const chip = el('button', 'nero-chip' + (NERO_FILTER === key ? ' active' : ''), label);
      chip.addEventListener('click', () => { NERO_FILTER = key; setTab('market'); });
      filterRow.appendChild(chip);
    });
    c.appendChild(filterRow);
  }
  const shown = NERO_FILTER === 'all' ? sellable : sellable.filter(i => i.rarity === NERO_FILTER);
  shown.forEach(it => {
    const row = el('div', 'mission-row');
    row.appendChild(el('div', 'mission-mid',
      `${itemIconHtml(it, 'item-icon')} <b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span><br>
       <span class="small muted">+${it.xp}% XP</span>`));
    const sv = RPG.sellValue(HERO, it);
    const btn = el('button', 'btn btn-small btn-primary', `🏷️ ${sv} 🪙`);
    btn.addEventListener('click', () => showItemPreview(it));
    row.appendChild(btn);
    c.appendChild(row);
  });
}

function renderFucina(c) {
  HERO.forgeSeen = todayISO();
  persist();
  updateBadges();
  c.appendChild(npcBanner('assets/avatars/fabbro.png', 'Mastro Brontolo',
    '«Batto il ferro dall\'alba, ragazzino. Tre pezzi al giorno, prendere o lasciare. E non toccare l\'incudine!»'));
  const offers = RPG.forgeOffers(HERO);
  const op = el('div', 'panel');
  op.appendChild(el('h3', 'panel-title', '🔥 In vetrina oggi'));
  offers.forEach(o => {
    const bought = HERO.items.some(i => i.name === o.name && i.rarity === o.rarity);
    const row = el('div', 'mission-row' + (o.special ? ' special-offer' : ''));
    row.appendChild(el('div', 'mission-mid',
      (o.special ? `<span class="tag tag-sale">🔥 -30% SOLO OGGI · <span data-cd="midnight">…</span></span><br>` : '') +
      `${itemIconHtml(o, 'item-icon')} <b>${esc(o.name)}</b> <span class="tag">${RPG.RARITIES[o.rarity].label}</span><br>
       <span class="small muted">+${o.xp}% XP · ${RPG.SLOTS[o.slot].label}${o.special ? ` · <s>🪙${o.fullPrice}</s>` : ''}</span>`));
    const btn = el('button', 'btn btn-small', `🪙${o.price}`);
    if (HERO.gold >= o.price && !bought) btn.classList.add('btn-primary');
    if (bought) { btn.textContent = '✅'; btn.disabled = true; }
    btn.addEventListener('click', () => {
      const err = RPG.buyForgeItem(HERO, o);
      persist(); renderHUD();
      toast(err || `${o.icon} ${o.name} acquistato!`);
      setTab('market');
    });
    row.appendChild(btn);
    op.appendChild(row);
  });
  c.appendChild(op);

  const wearable = HERO.items.filter(i =>
    ['arma', 'scudo', 'elmo', 'armatura'].includes(i.slot) &&
    !Object.values(HERO.equipment).includes(i.id));
  if (wearable.length) {
    const sp = el('div', 'panel');
    sp.appendChild(el('h3', 'panel-title', '♻️ Vendi al fabbro'));
    wearable.forEach(it => {
      const row = el('div', 'mission-row');
      row.appendChild(el('div', 'mission-mid',
        `${itemIconHtml(it, 'item-icon')} <b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span>`));
      const sv = RPG.sellValue(HERO, it);
      const btn = el('button', 'btn btn-small', `Vendi 🪙${sv}`);
      btn.addEventListener('click', () => {
        RPG.sellItem(HERO, it.id);
        persist(); renderHUD();
        toast(`🪙 +${sv} monete!`);
        setTab('market');
      });
      row.appendChild(btn);
      sp.appendChild(row);
    });
    c.appendChild(sp);
  }
}

/* ── Erborista (NPC mercante consumabili) ─────────────────────────────── */
const ERBORISTA_CATS = [
  { id: 'tutti',    label: 'Tutti' },
  { id: 'pozioni',  label: '🍯 Pozioni' },
  { id: 'rune',     label: '🔮 Rune' },
  { id: 'utility',  label: '🧭 Utility' },
  { id: 'materiali',label: '⚒️ Materiali' },
];
let ERBORISTA_CAT = 'tutti';

function _erboristaOffers() {
  /* 3 offerte giornaliere seeded per data, 30% sconto */
  const seed = (s => { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return h >>> 0; })(new Date().toISOString().slice(0, 10));
  const forSale = RPG.CONSUMABLES.filter(c => c.rarity !== 'leggendario');
  const picks = [];
  let s = seed;
  while (picks.length < 3) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const co = forSale[s % forSale.length];
    if (!picks.find(p => p.id === co.id)) picks.push(co);
  }
  return picks.map(co => ({ co, price: Math.floor(RPG.buyPriceConsumable(co.id) * 0.7) }));
}

function renderErborista(c) {
  c.appendChild(npcBanner(`assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG['spirito_foresta'] || 'spirito_foresta')}.png`, 'Madre Radice', '"Ogni seme vuole germogliare. Ogni eroe ha bisogno di carburante."'));

  /* Offerta del Giorno */
  const offerPanel = el('div', 'panel erborista-offer-panel');
  offerPanel.appendChild(el('h3', 'panel-title', '🌅 Offerta del Giorno · -30%'));
  const offerRow = el('div', 'erborista-offer-row');
  _erboristaOffers().forEach(({ co, price }) => {
    const card = el('div', `consumable-card rarity-${co.rarity} erborista-offer-card`);
    const imgWrap = el('div', 'consumable-img-wrap');
    const img = el('img', 'consumable-img');
    img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.png`;
    img.alt = co.name;
    img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);
    card.appendChild(el('div', 'consumable-name', co.name));
    const priceEl = el('div', 'erborista-offer-price');
    priceEl.innerHTML = `<s class="muted">${RPG.buyPriceConsumable(co.id)}🪙</s> <b>${price}🪙</b>`;
    card.appendChild(priceEl);
    const buyBtn = el('button', `btn btn-primary btn-small${HERO.gold < price ? ' disabled' : ''}`, 'Acquista');
    buyBtn.disabled = HERO.gold < price;
    buyBtn.addEventListener('click', () => {
      if (HERO.gold < price) { toast('Oro insufficiente!'); return; }
      HERO.gold -= price; RPG.addConsumable(HERO, co.id, 1);
      persist(); renderHUD();
      toast(`${co.icon} ${co.name} acquistato in offerta!`);
      setTab('market');
    });
    card.appendChild(buyBtn);
    offerRow.appendChild(card);
  });
  offerPanel.appendChild(offerRow);
  c.appendChild(offerPanel);

  const sw = el('div', 'coll-switch');
  ERBORISTA_CATS.forEach(cat => {
    const b = el('button', 'coll-btn' + (ERBORISTA_CAT === cat.id ? ' active' : ''), cat.label);
    b.addEventListener('click', () => { ERBORISTA_CAT = cat.id; setTab('market'); });
    sw.appendChild(b);
  });
  c.appendChild(sw);

  // Solo comuni ed epici disponibili per l'acquisto (leggendari mai)
  const forSale = RPG.CONSUMABLES.filter(co =>
    co.rarity !== 'leggendario' &&
    (ERBORISTA_CAT === 'tutti' || co.cat === ERBORISTA_CAT)
  );

  const grid = el('div', 'consumable-grid');
  forSale.forEach(co => {
    const price = RPG.buyPriceConsumable(co.id);
    const qty   = (HERO.consumables || {})[co.id] || 0;
    const card  = el('div', `consumable-card rarity-${co.rarity}`);
    const imgWrap = el('div', 'consumable-img-wrap');
    const img = el('img', 'consumable-img');
    img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.png`;
    img.alt = co.name;
    img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);
    card.appendChild(el('div', 'consumable-name', co.name));
    card.appendChild(el('div', 'consumable-desc muted small', co.desc));
    if (qty > 0) card.appendChild(el('span', 'consumable-qty', `×${qty} in sacca`));
    const buyBtn = el('button', `btn btn-primary btn-small${HERO.gold < price ? ' disabled' : ''}`, `${price} 🪙`);
    buyBtn.disabled = HERO.gold < price;
    buyBtn.addEventListener('click', () => {
      if (HERO.gold < price) { toast('Oro insufficiente!'); return; }
      HERO.gold -= price;
      RPG.addConsumable(HERO, co.id, 1);
      persist(); renderHUD();
      toast(`${co.icon} ${co.name} acquistato!`);
      setTab('market');
    });
    card.appendChild(buyBtn);
    grid.appendChild(card);
  });
  c.appendChild(grid);
}

/* ── TAB: Eroe (equipaggiamento + sottomenù) ── */
let HERO_VIEW = 'main';

function renderHero(c) {
  if (HERO_VIEW === 'cards') { renderCardsView(c); return; }
  if (HERO_VIEW === 'bestiary') { renderBestiaryView(c); return; }
  if (HERO_VIEW === 'story') { renderStoryView(c); return; }
  if (HERO_VIEW === 'settings') { renderSettingsView(c); return; }
  if (HERO_VIEW === 'diary')    { renderDiaryView(c);    return; }
  if (HERO_VIEW === 'zaino')    { renderZainoView(c);    return; }
  if (HERO_VIEW === 'guida')    { renderGuidaView(c);    return; }

  const titleH2 = el('h2', 'section-title on-parchment-title hero-title-row');
  titleH2.innerHTML = '🛡️ Equipaggiamento';
  const settingsBtn = el('button', 'hero-settings-btn', '⚙️');
  settingsBtn.title = 'Impostazioni';
  settingsBtn.addEventListener('click', () => { HERO_VIEW = 'settings'; setTab('hero'); });
  titleH2.appendChild(settingsBtn);
  c.appendChild(titleH2);

  // Eroe: 3 slot sx, avatar al centro, 3 slot dx + seme/consumabile sotto
  const rig = el('div', 'hero-rig');
  const leftCol = el('div', 'slot-col');
  const rightCol = el('div', 'slot-col');
  const equipSlots = ['arma', 'scudo', 'elmo', 'armatura', 'anello', 'amuleto'];
  const leftSlots  = equipSlots.slice(0, 3);
  const rightSlots = equipSlots.slice(3);

  const EMPTY_SLOT_IMG = {
    elmo: 'assets/ui/eroe/slot_elmo.png',
    armatura: 'assets/ui/eroe/slot_armatura.png',
    arma: 'assets/ui/eroe/slot_arma.png',
    scudo: 'assets/ui/eroe/slot_scudo.png',
    anello: 'assets/ui/eroe/slot_anello.png',
    amuleto: 'assets/ui/eroe/slot_amuleto.png',
  };
  const makeSlot = key => {
    const s = RPG.SLOTS[key];
    const itemId = HERO.equipment[key];
    const item = HERO.items.find(i => i.id === itemId);
    const slot = el('button', 'equip-slot' + (item ? ' filled rar-border-' + item.rarity : ''));
    if (item) {
      slot.innerHTML = `${itemIconHtml(item, 'equip-img')}<span class="equip-label">+${item.xp}%</span>`;
    } else if (EMPTY_SLOT_IMG[key]) {
      slot.innerHTML = `<img class="equip-icon-img empty" src="${EMPTY_SLOT_IMG[key]}"><span class="equip-label">${s.label}</span>`;
    } else {
      slot.innerHTML = `<span class="equip-icon empty">${s.icon}</span><span class="equip-label">${s.label}</span>`;
    }
    slot.addEventListener('click', () => openSlotPicker(key));
    return slot;
  };
  leftSlots.forEach(k => leftCol.appendChild(makeSlot(k)));
  rightSlots.forEach(k => rightCol.appendChild(makeSlot(k)));

  const center = el('div', 'hero-center');
  const heroCls = isImageAvatar(HERO)
    ? 'hero-fullbody hero-fullbody-big hero-idle'
    : 'hero-avatar hero-idle';
  const av = avatarEl(HERO, heroCls);
  center.appendChild(av);
  rig.appendChild(leftCol);
  rig.appendChild(center);
  rig.appendChild(rightCol);
  c.appendChild(rig);

  // Slot seme + consumabile sotto i piedi
  const bottomSlots = el('div', 'hero-bottom-slots');
  ['seme', 'consumabile'].forEach(k => bottomSlots.appendChild(makeSlot(k)));
  c.appendChild(bottomSlots);

  c.appendChild(el('h3', 'hero-name-plate center', esc(HERO.name)));
  const mount = HERO.mount ? RPG.mountById(HERO.mount) : null;
  c.appendChild(el('p', 'hero-title-plate center',
    `Livello ${HERO.level} — ${RPG.heroTitle(HERO.level)}` +
    (mount ? ` · ${mount.emoji}` : '') + (HERO.companion ? ' · 🐺' : '')));
  const bonus = RPG.equipmentXpBonus(HERO);
  c.appendChild(el('p', 'center small equip-total', bonus > 0
    ? `⚡ Bonus equipaggiamento: <b>+${bonus}% XP</b>`
    : 'Tocca gli slot per equipaggiare il tuo bottino'));
  const talent = RPG.talentOf(HERO);
  if (talent) c.appendChild(el('p', 'center small talent-line',
    `${talent.icon} Talento: <b>${talent.name}</b> — ${talent.desc}`));

  // Titolo PvP
  const pt = pvpTitle(HERO.pvpWins || 0);
  if (pt) {
    const ptEl = el('p', 'center pvp-badge-profile');
    ptEl.innerHTML = `${pt.icon} <b>${pt.label}</b> · ⚔️ ${HERO.pvpWins} ${HERO.pvpWins === 1 ? 'vittoria' : 'vittorie'}`;
    c.appendChild(ptEl);
  }

  // Sacca del Viandante
  const consCount = Object.values(HERO.consumables || {}).reduce((s, q) => s + q, 0);
  const activeBuff = HERO.consumableBuffs && (
    HERO.consumableBuffs.xpMult || HERO.consumableBuffs.goldMult ||
    HERO.consumableBuffs.allBoost || HERO.consumableBuffs.streakShield > 0
  );
  const saccaBtn = el('button', `btn ${activeBuff ? 'btn-primary' : ''} wide`, `💰 Sacca del Viandante${consCount > 0 ? ` (${consCount})` : ''}`);
  if (activeBuff) saccaBtn.style.position = 'relative';
  saccaBtn.addEventListener('click', () => { HERO_VIEW = 'zaino'; setTab('hero'); });
  c.appendChild(saccaBtn);

  // Sottomenù
  const sub = el('div', 'hero-submenu');
  [['story', 'storia', '📜', 'La tua Storia'], ['cards', 'carte', '🎴', 'Carte & Imprese'], ['bestiary', 'bestiario', '🐉', 'Bestiario'], ['diary', 'imprese_stivale', '📊', 'Diario']].forEach(([k, file, emoji, label]) => {
    const b = el('button', 'btn submenu-btn');
    b.innerHTML = `<span class="submenu-emoji">${emoji}</span><span>${label}</span>`;
    const img = new Image();
    img.onload = () => { b.innerHTML = `<img class="submenu-icon" src="assets/ui/eroe/${file}.png"><span>${label}</span>`; };
    img.src = `assets/ui/eroe/${file}.png`;
    b.addEventListener('click', () => { HERO_VIEW = k; setTab('hero'); });
    sub.appendChild(b);
  });
  c.appendChild(sub);

  // Prestige (Rinascita)
  if (RPG.canPrestige(HERO)) {
    const pc = el('div', 'panel prestige-panel');
    pc.appendChild(el('h3', 'panel-title', '✨ Rinascita'));
    pc.appendChild(el('p', 'center', 'Hai raggiunto il livello massimo. Puoi rinascere: torni al livello 1, ma guadagni <b>+20% XP permanente</b> per sempre.'));
    const pb = el('button', 'btn btn-primary wide', `✨ Rinasci (prestige ${(HERO.prestige?.count||0)+1})`);
    pb.addEventListener('click', () => {
      modal(`<h3 class="panel-title center">✨ Sei sicuro?</h3>
        <p class="center muted">Torni al livello 1 ma ottieni <b>+20% XP permanente</b>.<br>Oggetti, km, trofei e oro rimangono.</p>
        <button class="btn btn-primary wide" id="btn-prestige-confirm">✨ Rinasci!</button>
        <button class="btn wide" onclick="closeModal()">Annulla</button>`);
      setTimeout(() => {
        const btn = $('#btn-prestige-confirm');
        if (btn) btn.addEventListener('click', () => {
          RPG.prestige(HERO); persist(); renderHUD();
          vibrate([200,100,200,100,400]);
          closeModal();
          setTimeout(() => modal(`<h3 class="center" style="font-size:1.3rem">✨ Sei rinato!<br>+20% XP per sempre</h3>
            <p class="center" style="font-size:2rem">⭐</p>
            <button class="btn btn-primary wide" onclick="nextOpening();setTab('hero')">Ricomincia l'avventura!</button>`), 300);
        });
      }, 50);
    });
    pc.appendChild(pb);
    c.appendChild(pc);
  } else if (HERO.prestige && HERO.prestige.count > 0) {
    c.appendChild(el('p', 'center small muted', `✨ Prestige ${HERO.prestige.count} · +${HERO.prestige.count*20}% XP permanente`));
  }

  // ── Albero Abilità ──
  {
    const pts = HERO.skillPoints || 0;
    const sp2 = el('div', 'panel skill-tree-panel');
    sp2.appendChild(el('h3', 'panel-title', `🌟 Abilità Passive${pts > 0 ? ` <span class="skill-pts-badge">${pts}</span>` : ''}`));
    sp2.appendChild(el('p', 'muted small', `Punti disponibili: <b>${pts}</b> · guadagni 1 punto ogni 5 livelli`));
    const grid = el('div', 'skill-tree-grid');
    RPG.SKILL_TREE.forEach(sk => {
      const learned = (HERO.skills || []).includes(sk.id);
      const canLearn = !learned && HERO.level >= sk.reqLevel && pts >= sk.cost;
      const locked = HERO.level < sk.reqLevel;
      const cell = el('div', 'skill-cell' + (learned ? ' learned' : locked ? ' locked' : canLearn ? ' available' : ''));
      cell.innerHTML = `<span class="skill-icon">${sk.icon}</span><span class="skill-name">${esc(sk.name)}</span><span class="skill-desc muted small">${esc(sk.desc)}</span>`;
      if (locked) {
        cell.innerHTML += `<span class="skill-req muted small">Lv ${sk.reqLevel}</span>`;
      } else if (learned) {
        cell.innerHTML += `<span class="skill-state done-strip">✅</span>`;
      } else if (canLearn) {
        const btn = el('button', 'btn btn-primary', `+${sk.cost} pt`);
        btn.addEventListener('click', () => {
          const err = RPG.learnSkill(HERO, sk.id);
          if (err) { toast(err); return; }
          persist();
          vibrate([80, 40, 120]);
          setTab('hero');
        });
        cell.appendChild(btn);
      } else {
        cell.innerHTML += `<span class="skill-req muted small">Lv ${sk.reqLevel} · ${sk.cost} pt</span>`;
      }
      grid.appendChild(cell);
    });
    sp2.appendChild(grid);
    c.appendChild(sp2);
  }

  // ── Cronache di Oakhaven (Lore) ──
  {
    const unlocked = HERO.loreUnlocked || [];
    if (unlocked.length > 0 || HERO.totalKm >= 40) {
      const lp = el('div', 'panel lore-panel');
      lp.appendChild(el('h3', 'panel-title', `📖 Cronache di Oakhaven <span class="muted small">${unlocked.length}/${RPG.LORE_FRAGMENTS.length}</span>`));
      if (unlocked.length === 0) {
        lp.appendChild(el('p', 'muted small', 'Percorri 50 km totali per sbloccare il primo capitolo.'));
      } else {
        RPG.LORE_FRAGMENTS.forEach(f => {
          const isUnlocked = unlocked.includes(f.id);
          const item = el('div', 'lore-item' + (isUnlocked ? '' : ' lore-locked'));
          if (isUnlocked) {
            item.innerHTML = `<div class="lore-title">${esc(f.title)}</div><p class="lore-text small">${esc(f.text)}</p>`;
          } else {
            item.innerHTML = `<div class="lore-title muted">🔒 Capitolo — sblocca a ${f.km} km totali</div>`;
          }
          lp.appendChild(item);
        });
      }
      c.appendChild(lp);
    }
  }

  const sw = el('button', 'btn wide', '↩ Cambia Eroe');
  sw.addEventListener('click', () => { STATE.current = null; persist(); renderProfiles(); });
  c.appendChild(sw);
}

function renderDiaryView(c) {
  backBar(c);
  c.appendChild(el('h2', 'section-title', '📜 Diario del Viandante'));

  // Statistiche totali
  const sp = el('div', 'panel');
  sp.appendChild(el('h3', 'panel-title', '⚔️ Statistiche Totali'));
  const sd = el('div', 'stats-diary-grid');
  [
    ['🥾', HERO.log.length,                                    'Sessioni'],
    ['🗺️', HERO.totalKm.toFixed(1) + ' km',                   'Totale'],
    ['🚶', (HERO.kmByType.camminata || 0).toFixed(1) + ' km', 'Cammino'],
    ['🏃', (HERO.kmByType.corsa     || 0).toFixed(1) + ' km', 'Corsa'],
    ['🚴', (HERO.kmByType.cyclette  || 0).toFixed(1) + ' km', 'Cyclette'],
    ['⭐', (HERO.achievementsClaimed || []).length,            'Imprese'],
    ['📦', HERO.lootBagsOpened || 0,                          'Sacchi'],
    ['💎', HERO.fragmentsFound || 0,                          'Frammenti'],
  ].forEach(([ico, val, lbl]) => {
    const it = el('div', 'stats-diary-item');
    it.innerHTML = `<div class="stats-diary-val">${ico} ${val}</div><div class="stats-diary-lbl">${lbl}</div>`;
    sd.appendChild(it);
  });
  sp.appendChild(sd);
  c.appendChild(sp);

  // Riepilogo settimana
  {
    const now2 = new Date();
    const mondayStart = new Date(now2);
    mondayStart.setHours(0, 0, 0, 0);
    mondayStart.setDate(now2.getDate() - ((now2.getDay() + 6) % 7));
    const weekLogs = HERO.log.filter(l => new Date(l.date) >= mondayStart);
    const weekKm = { cyclette: 0, camminata: 0, corsa: 0 };
    weekLogs.forEach(l => { weekKm[l.type] = (weekKm[l.type] || 0) + l.km; });
    const totalWeek = Object.values(weekKm).reduce((s, v) => s + v, 0);
    const maxKm = Math.max(...Object.values(weekKm), 0.1);
    const actColors = { cyclette: '#5a9fd4', camminata: '#5abf7a', corsa: '#e07040' };
    const weekPanel = el('div', 'panel');
    weekPanel.appendChild(el('h3', 'panel-title', '📅 Questa Settimana'));
    Object.entries(RPG.ACTIVITIES).forEach(([key, a]) => {
      const km = weekKm[key] || 0;
      const pct = Math.round(km / maxKm * 100);
      const row = el('div', 'week-row');
      row.innerHTML = `<span class="week-row-label">${a.icon} ${a.label}</span>
        <div class="week-bar-wrap"><div class="week-bar-fill" style="width:${pct}%;background:${actColors[key]}"></div></div>
        <span class="week-row-val">${km.toFixed(1)}</span>`;
      weekPanel.appendChild(row);
    });
    weekPanel.appendChild(el('p', 'center small', `Totale: <b>${totalWeek.toFixed(1)} km</b> questa settimana`));
    c.appendChild(weekPanel);
  }

  // Trofei km
  {
    const trophyPanel = el('div', 'panel');
    trophyPanel.appendChild(el('h3', 'panel-title', '🏆 Trofei'));
    const trophyGrid = el('div', 'trophy-grid');
    const earnedTrophies = HERO.trophies || [];
    RPG.TROPHIES.forEach(t => {
      const unlocked = earnedTrophies.includes(t.id);
      const cell = el('div', 'trophy-cell' + (unlocked ? ' trophy-unlocked' : ' trophy-locked'));
      cell.title = unlocked ? `${t.name} — ${t.desc}` : `Sblocca a ${t.km} km`;
      cell.innerHTML = `<span class="trophy-icon">${unlocked ? t.icon : '🔒'}</span><span class="trophy-name">${t.name}</span><span class="trophy-km">${t.km} km</span>`;
      trophyGrid.appendChild(cell);
    });
    trophyPanel.appendChild(trophyGrid);
    c.appendChild(trophyPanel);
  }

  // Imprese
  {
    const stats = el('div', 'panel');
    const impreseTitle = el('h3', 'panel-title', '📊 Imprese');
    stats.appendChild(impreseTitle);
    const shieldImg = new Image();
    shieldImg.onload = () => { impreseTitle.innerHTML = `<img class="panel-title-icon" src="assets/ui/eroe/imprese_spade.png"> Imprese`; };
    shieldImg.src = 'assets/ui/eroe/imprese_spade.png';
    const impreseRows = [
      ['stivale', 'Km totali', `${HERO.totalKm.toFixed(1)}`],
      ['cavallo', 'In sella', `${(HERO.kmByType.cyclette || 0).toFixed(1)} km`],
      ['pellegrino', 'A piedi', `${(HERO.kmByType.camminata || 0).toFixed(1)} km`],
      ['cavaliere', 'Di corsa', `${(HERO.kmByType.corsa || 0).toFixed(1)} km`],
      ['chiave', 'Streak login', `${HERO.streak.count} giorni`],
      ['spade', 'Missioni compiute', `${HERO.missionsDone.length}`],
      ['zaino', 'Oggetti nello zaino', `${HERO.items.length}`],
    ];
    impreseRows.forEach(([file, label, val]) => {
      const row = el('div', 'stat-row');
      row.innerHTML = `<span class="stat-row-label"><img class="stat-row-icon" src="assets/ui/eroe/imprese_${file}.png" onerror="this.style.display='none'">${label}</span><b>${val}</b>`;
      stats.appendChild(row);
    });
    c.appendChild(stats);
  }

  // Reliquie del Viandante
  {
    const relPanel = el('div', 'panel');
    relPanel.appendChild(el('h3', 'panel-title', '🗿 Reliquie del Viandante'));
    const discovered = HERO.biomesDiscovered || [];
    const found = discovered.length;
    const total = RPG.BIOME_ARTIFACTS.length;
    const prog = el('p', 'center small muted');
    prog.innerHTML = `${found} / ${total} reliquie scoperte`;
    relPanel.appendChild(prog);
    const grid = el('div', 'artifacts-grid');
    RPG.BIOME_ARTIFACTS.forEach((art, idx) => {
      const unlocked = discovered.includes(idx);
      const cell = el('div', 'artifact-cell' + (unlocked ? ' artifact-unlocked' : ' artifact-locked'));
      if (unlocked) {
        cell.innerHTML = `<span class="artifact-icon">${art.icon}</span><span class="artifact-name">${esc(art.name)}</span><span class="artifact-flavor">${esc(art.flavor)}</span>`;
      } else {
        cell.innerHTML = `<span class="artifact-icon artifact-unknown">?</span><span class="artifact-name muted">???</span>`;
      }
      grid.appendChild(cell);
    });
    relPanel.appendChild(grid);
    c.appendChild(relPanel);
  }

  // Epistolario
  {
    const letters = HERO.lettersReceived || [];
    if (letters.length) {
      const epPanel = el('div', 'panel');
      epPanel.appendChild(el('h3', 'panel-title', '📬 Epistolario'));
      letters.forEach(id => {
        const letter = RPG.WORLD_LETTERS.find(l => l.id === id);
        if (!letter) return;
        const card = el('div', 'ep-card');
        card.innerHTML = `
          <div class="ep-card-header">
            <span class="ep-icon">${letter.icon}</span>
            <div class="ep-meta">
              <span class="ep-sender">${esc(letter.sender)}</span>
              <span class="ep-role">${esc(letter.role)}</span>
            </div>
          </div>
          <div class="ep-title">${esc(letter.title)}</div>`;
        card.addEventListener('click', () => {
          const bodyHtml = esc(letter.body).replace(/\n/g, '<br>');
          modal(`
            <div class="ep-modal-header">
              <span style="font-size:2rem">${letter.icon}</span>
              <div><b>${esc(letter.sender)}</b><br><span class="muted small">${esc(letter.role)}</span></div>
            </div>
            <h3 style="margin:12px 0 8px;text-align:center">${esc(letter.title)}</h3>
            <p class="ep-modal-body">${bodyHtml}</p>
            <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>`);
        });
        epPanel.appendChild(card);
      });
      c.appendChild(epPanel);
    }
  }

  // Calendario mensile + Heatmap
  if (HERO.log.length) {
    const kmByDay = {};
    HERO.log.forEach(l => {
      const key = new Date(l.date).toISOString().slice(0, 10);
      kmByDay[key] = (kmByDay[key] || 0) + l.km;
    });

    // Calendario mese corrente
    const now = new Date();
    const yr = now.getFullYear(), mo = now.getMonth();
    const MONTH_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const firstDay = new Date(yr, mo, 1);
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const startDow = (firstDay.getDay() + 6) % 7; // Monday-based (0=Mon)
    const calPanel = el('div', 'panel km-heatmap-wrap');
    calPanel.appendChild(el('h3', 'panel-title', `📅 ${MONTH_IT[mo]} ${yr}`));
    const calGrid = el('div', 'cal-grid');
    ['L','M','M','G','V','S','D'].forEach(d => calGrid.appendChild(el('div', 'cal-day-hdr', d)));
    for (let i = 0; i < startDow; i++) calGrid.appendChild(el('div', 'cal-cell cal-empty'));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const km = kmByDay[key] || 0;
      const intensity = km === 0 ? 0 : km < 2 ? 1 : km < 5 ? 2 : km < 10 ? 3 : 4;
      const cell = el('div', 'cal-cell' + (d === now.getDate() ? ' cal-today' : ''));
      cell.dataset.i = intensity;
      cell.title = `${d} ${MONTH_IT[mo]}: ${km > 0 ? km.toFixed(1) + ' km' : 'riposo'}`;
      cell.innerHTML = `<span class="cal-day-num">${d}</span>${km > 0 ? `<span class="cal-day-km">${km.toFixed(1)}</span>` : ''}`;
      calGrid.appendChild(cell);
    }
    calPanel.appendChild(calGrid);
    c.appendChild(calPanel);

    // Grafico km ultimi 8 settimane
    const weeklyTotals = [];
    const weekLabels = [];
    for (let w = 7; w >= 0; w--) {
      const ref = new Date(); ref.setHours(0,0,0,0);
      ref.setDate(ref.getDate() - ((ref.getDay()+6)%7) - w*7);
      const end = new Date(ref); end.setDate(end.getDate()+7);
      const km = HERO.log.filter(l => { const d=new Date(l.date); return d>=ref && d<end; }).reduce((s,l)=>s+l.km,0);
      weeklyTotals.push(+km.toFixed(1));
      weekLabels.push(w===0?'Questa':`${ref.getDate()}/${ref.getMonth()+1}`);
    }
    const chartPanel = el('div', 'panel km-heatmap-wrap');
    chartPanel.appendChild(el('h3', 'panel-title', '📈 Km · Ultime 8 Settimane'));
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 120;
    canvas.style.cssText = 'width:100%;height:auto;display:block';
    chartPanel.appendChild(canvas);
    c.appendChild(chartPanel);
    requestAnimationFrame(() => {
      const ctx2 = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const pad = { t:12, b:22, l:8, r:8 };
      const maxKmW = Math.max(...weeklyTotals, 1);
      const bw = (W - pad.l - pad.r) / weeklyTotals.length;
      ctx2.clearRect(0,0,W,H);
      // Bars
      weeklyTotals.forEach((km, i) => {
        const bh = ((H - pad.t - pad.b) * km / maxKmW);
        const x = pad.l + i * bw + bw*0.15;
        const y = H - pad.b - bh;
        const isLast = i === weeklyTotals.length - 1;
        ctx2.fillStyle = isLast ? '#e8b64c' : '#5abf7a88';
        ctx2.roundRect(x, y, bw*0.7, bh, 3);
        ctx2.fill();
        // value label
        if (km > 0) {
          ctx2.fillStyle = '#fff';
          ctx2.font = 'bold 9px sans-serif';
          ctx2.textAlign = 'center';
          ctx2.fillText(km.toFixed(0), x + bw*0.35, y - 3);
        }
        // week label
        ctx2.fillStyle = '#9e8060';
        ctx2.font = '9px sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText(weekLabels[i], x + bw*0.35, H - pad.b + 12);
      });
    });

    const today = new Date(); today.setHours(0,0,0,0);
    const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const hmWrap = el('div', 'panel km-heatmap-wrap');
    hmWrap.appendChild(el('h3', 'panel-title', '🌙 Attività degli Ultimi 3 Mesi'));

    // Calculate month label per week column (12 columns of 7 days)
    const weekMonthLabel = new Array(12).fill('');
    let prevHmMonth = -1;
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const col = Math.floor((83 - i) / 7);
      if (d.getMonth() !== prevHmMonth) { weekMonthLabel[col] = MONTHS_SHORT[d.getMonth()]; prevHmMonth = d.getMonth(); }
    }

    // Outer wrapper: day-labels column + right area
    const hmOuter = el('div', 'hm-outer');

    // Day labels (L M M G V S D) — show only alternate ones to save space
    const dayCol = el('div', 'hm-daylabels');
    ['L','','M','','V','','D'].forEach(d => dayCol.appendChild(el('div', 'hm-daylabel', d)));
    hmOuter.appendChild(dayCol);

    // Right: month row + grid
    const hmRight = el('div', 'hm-right');
    const monthRow = el('div', 'hm-month-row');
    weekMonthLabel.forEach(lbl => monthRow.appendChild(el('div', 'hm-month-cell', lbl)));
    hmRight.appendChild(monthRow);

    const hm = el('div', 'km-heatmap');
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const km = kmByDay[key] || 0;
      const intensity = km === 0 ? 0 : km < 2 ? 1 : km < 5 ? 2 : km < 10 ? 3 : 4;
      const cell = el('div', 'hm-cell');
      cell.dataset.i = intensity;
      cell.title = `${d.toLocaleDateString('it-IT')}: ${km > 0 ? km.toFixed(1) + ' km' : 'riposo'}`;
      hm.appendChild(cell);
    }
    hmRight.appendChild(hm);
    hmOuter.appendChild(hmRight);
    hmWrap.appendChild(hmOuter);

    const legend = el('div', 'hm-legend');
    legend.innerHTML = `Meno <div class="hm-legend-cell" style="background:rgba(255,255,255,.08)"></div><div class="hm-legend-cell" data-i="1"></div><div class="hm-legend-cell" data-i="2"></div><div class="hm-legend-cell" data-i="3"></div><div class="hm-legend-cell" data-i="4"></div> Più &nbsp;<span class="hm-legend-scale">(&lt;2 · &lt;5 · &lt;10 · 10+ km)</span>`;
    hmWrap.appendChild(legend);
    c.appendChild(hmWrap);
  }

  // Diario attività
  const lp = el('div', 'panel');
  lp.appendChild(el('h3', 'panel-title', '📜 Diario delle Attività'));
  if (!HERO.log.length) {
    lp.appendChild(emptyState('📜', 'Nessuna attività registrata ancora.'));
  } else {
    HERO.log.slice().reverse().forEach(l => {
      const a = RPG.ACTIVITIES[l.type];
      const d = new Date(l.date);
      lp.appendChild(el('div', 'log-row',
        `${a.icon} <b>${l.km} km</b> di ${a.label.toLowerCase()} — +${l.xp} XP <span class="muted small">(${d.toLocaleDateString('it-IT')})</span>`));
    });
  }
  c.appendChild(lp);
}

function renderSettingsView(c) {
  const back = el('button', 'hero-back-pill', '‹ Eroe');
  back.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(back);
  c.appendChild(el('h2', 'section-title', '⚙️ Impostazioni'));
  const guidaBtn = el('button', 'btn btn-primary wide', '📖 Guida al Gioco');
  guidaBtn.addEventListener('click', () => { HERO_VIEW = 'guida'; setTab('hero'); });
  c.appendChild(guidaBtn);
  c.appendChild(renderShortcutPanel());
  c.appendChild(_settingsNotifPanel());
  c.appendChild(_settingsRefreshPanel());
  c.appendChild(_settingsBackupPanel());
  c.appendChild(_settingsFullscreenPanel());
  c.appendChild(_settingsPvpPanel());
  c.appendChild(_settingsDangerPanel());
}

function _settingsPvpPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '⚔️ Sfida un Amico'));
  p.appendChild(el('p', 'guide-text', 'Condividi la tua Hero Card con un amico. Chi percorre più km in 7 giorni vince oro e gloria. Il tuo record PvP è visibile nel profilo.'));
  const btn = el('button', 'btn btn-primary wide', '📤 Apri Sfida PvP');
  btn.addEventListener('click', showHeroShareCard);
  p.appendChild(btn);
  return p;
}

function _settingsNotifPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '🔔 Notifiche'));
  if (!('Notification' in window)) {
    p.appendChild(el('p', 'guide-text', 'Il tuo browser non supporta le notifiche.'));
    return p;
  }
  const perm = Notification.permission;
  const desc = perm === 'granted'
    ? 'Le notifiche sono attive. Riceverai reminder per l\'allenamento serale, streak in pericolo, spedizioni del famiglio e aggiornamenti sulle sfide PvP.'
    : perm === 'denied'
    ? 'Le notifiche sono bloccate dal browser. Riabilitale nelle impostazioni del sito.'
    : 'Abilita le notifiche per ricevere reminder sull\'allenamento, streak, famiglio e sfide PvP — anche con l\'app chiusa.';
  p.appendChild(el('p', 'guide-text', desc));
  if (perm === 'default') {
    const btn = el('button', 'btn btn-primary', '🔔 Abilita notifiche');
    btn.addEventListener('click', async () => {
      const r = await Notification.requestPermission();
      HERO.notifAsked = true; persist();
      if (r === 'granted') { toast('🔔 Notifiche attivate!'); checkAndNotify(); }
      else toast('Notifiche non autorizzate.');
      setTab('hero');
    });
    p.appendChild(btn);
  } else if (perm === 'granted') {
    const btn = el('button', 'btn', '✅ Notifiche attive');
    btn.disabled = true;
    p.appendChild(btn);
  }
  return p;
}

function _settingsRefreshPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '🔄 Aggiornamenti'));
  p.appendChild(el('p', 'guide-text', 'Se il gioco non mostra le ultime novità, svuota la cache per scaricare tutto da capo.'));

  const clearBtn = el('button', 'btn btn-primary', '🗑️ Svuota cache e ricarica');
  clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    clearBtn.textContent = '⏳ Pulizia in corso…';
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      location.reload(true);
    } catch { location.reload(true); }
  });
  p.appendChild(clearBtn);
  return p;
}

function _settingsBackupPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '💾 Backup salvataggio'));
  p.appendChild(el('p', 'guide-text', 'Esporta i tuoi eroi su file JSON e reimportali su qualsiasi dispositivo.'));

  // ── Export ───────────────────────────────────────────────────
  const exportBtn = el('button', 'btn btn-primary', '📤 Esporta salvataggio');
  exportBtn.addEventListener('click', () => {
    const data = localStorage.getItem('rpgym_save_v1');
    if (!data) { toast('Nessun salvataggio trovato.'); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heropace_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('📤 Backup esportato!');
  });

  // ── Import ───────────────────────────────────────────────────
  const importBtn = el('button', 'btn', '📥 Importa salvataggio');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = RPG.parseBackup(e.target.result);
        if (!imported.heroes || !imported.heroes.length) throw new Error('nessun eroe trovato');

        const heroRows = imported.heroes.map(h =>
          `<div class="backup-hero-row">
             <span class="backup-hero-avatar">${avatarEmojiFor(h)}</span>
             <span class="backup-hero-name">${esc(h.name)}</span>
             <span class="backup-hero-level">Lv ${h.level}</span>
             <span class="backup-hero-km">${(h.totalKm||0).toFixed(1)} km</span>
           </div>`
        ).join('');

        const currentCount = STATE.heroes.length;
        const importCount  = imported.heroes.length;

        modal(`
          <h3 class="panel-title">📥 Importa backup</h3>
          <p class="guide-text" style="margin-bottom:.6rem">
            Il backup contiene <strong>${importCount}</strong> ${importCount === 1 ? 'eroe' : 'eroi'}:
          </p>
          <div class="backup-hero-list">${heroRows}</div>
          <p class="guide-text" style="margin-top:.8rem">Come vuoi procedere?</p>
          <div class="backup-action-grid">
            <button id="btn-import-merge" class="btn btn-primary">
              🔀 Unisci<br><small>Aggiunge gli eroi mancanti senza cancellare i tuoi attuali</small>
            </button>
            <button id="btn-import-replace" class="btn btn-danger">
              ♻️ Sostituisci<br><small>Cancella i ${currentCount} eroi attuali e usa solo quelli del backup</small>
            </button>
          </div>
          <button id="btn-import-cancel" class="btn" style="margin-top:.6rem;width:100%">Annulla</button>
        `);

        document.getElementById('btn-import-cancel').addEventListener('click', closeModal);

        document.getElementById('btn-import-merge').addEventListener('click', () => {
          const { added, skipped } = RPG.mergeImport(STATE, imported);
          RPG.save(STATE);
          closeModal();
          toast(`✅ ${added} ${added === 1 ? 'eroe aggiunto' : 'eroi aggiunti'}${skipped ? `, ${skipped} già presenti` : ''}. Riavvio…`);
          setTimeout(() => location.reload(), 1500);
        });

        document.getElementById('btn-import-replace').addEventListener('click', () => {
          localStorage.setItem('rpgym_save_v1', e.target.result);
          closeModal();
          toast('✅ Salvataggio sostituito! Riavvio…');
          setTimeout(() => location.reload(), 1200);
        });

      } catch { toast('❌ File non valido o corrotto.'); }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  importBtn.addEventListener('click', () => fileInput.click());

  p.appendChild(exportBtn);
  p.appendChild(importBtn);
  p.appendChild(fileInput);
  return p;
}

function avatarEmojiFor(hero) {
  const map = {
    eroe1:'🧑',eroe2:'👩',fabbro:'⚒️',stregone:'🧙',alchimista:'⚗️',
    furfante:'🗡️',maga:'🔮',paladino:'🛡️',ranger:'🏹',fata:'🧚',
    principe:'🦅',principessa:'🦋',regina:'👑',predone:'💀',principessa_ghiacci:'❄️',sacerdotessa_sole:'☀️',principessa_draghi:'🐉',
  };
  return map[hero.storyId] || '🧑';
}

function _settingsFullscreenPanel() {
  if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) return el('div');
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '📱 Schermo intero'));
  p.appendChild(el('p', 'guide-text', 'Espandi il gioco a tutto schermo per un\'esperienza più immersiva.'));
  const btn = el('button', 'btn btn-primary', '⛶ Attiva schermo intero');
  btn.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        btn.textContent = '⛶ Attiva schermo intero';
      } else {
        await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
        btn.textContent = '✕ Esci da schermo intero';
      }
    } catch { toast('Schermo intero non disponibile su questo dispositivo.'); }
  });
  p.appendChild(btn);
  return p;
}

function _settingsDangerPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '⚠️ Zona pericolosa'));

  const resetBtn = el('button', 'btn btn-danger', '🗑️ Elimina eroe corrente');
  resetBtn.addEventListener('click', () => {
    if (!HERO) { toast('Nessun eroe attivo.'); return; }
    modal(`
      <h3 class="panel-title">🗑️ Elimina ${HERO.name}?</h3>
      <p>Questa azione è <strong>irreversibile</strong>. L'eroe e tutti i suoi progressi saranno persi per sempre.</p>
      <div class="row gap" style="margin-top:1rem">
        <button id="btn-del-cancel" class="btn">Annulla</button>
        <button id="btn-del-confirm" class="btn btn-danger">Elimina</button>
      </div>`);
    document.getElementById('btn-del-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-del-confirm').addEventListener('click', () => {
      RPG.deleteHero(STATE, HERO.id);
      persist();
      closeModal();
      toast('Eroe eliminato.');
      setTimeout(() => { HERO = null; showScreen('screen-profiles'); renderProfiles(); }, 800);
    });
  });

  const nukeBtn = el('button', 'btn btn-danger', '💀 Cancella tutti i dati');
  nukeBtn.addEventListener('click', () => {
    modal(`
      <h3 class="panel-title">💀 Cancella tutto?</h3>
      <p>Tutti gli eroi, i progressi e le impostazioni saranno cancellati. <strong>Non si può tornare indietro.</strong></p>
      <div class="row gap" style="margin-top:1rem">
        <button id="btn-nuke-cancel" class="btn">Annulla</button>
        <button id="btn-nuke-confirm" class="btn btn-danger">Cancella tutto</button>
      </div>`);
    document.getElementById('btn-nuke-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-nuke-confirm').addEventListener('click', () => {
      localStorage.removeItem('rpgym_save_v1');
      closeModal();
      toast('Dati cancellati. Riavvio…');
      setTimeout(() => location.reload(), 1200);
    });
  });

  p.appendChild(resetBtn);
  p.appendChild(nukeBtn);
  return p;
}

function openSlotPicker(slotKey) {
  const s = RPG.SLOTS[slotKey];
  const candidates = HERO.items.filter(i => i.slot === slotKey);
  let html = `<h3 class="panel-title">${s.icon} ${s.label}</h3>`;
  const current = HERO.equipment[slotKey];
  if (!candidates.length) {
    html += `<p class="muted center">Non hai ancora nessun oggetto per questo slot.<br>
      <span class="small">Completa missioni e allenamenti per trovarne!</span></p>`;
  }
  html += `<div class="loot-list" id="slot-picker-list"></div>`;
  if (current) html += `<button class="btn wide" id="btn-unequip">Rimuovi equipaggiamento</button>`;
  html += `<button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
  const list = $('#slot-picker-list');
  candidates.forEach(it => {
    const row = el('div', 'loot rar-' + it.rarity + ' pickable' + (it.id === current ? ' equipped' : ''));
    row.classList.add('loot-with-img');
    row.innerHTML = `${itemIconHtml(it, 'item-icon-big')}<div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span>${it.id === current ? ' ✅' : ''}</div>
      <div class="small">📈 +${it.xp}% XP · 🪙 ${it.value}</div></div>`;
    row.addEventListener('click', () => {
      RPG.equipItem(HERO, it.id);
      persist(); renderHUD();
      closeModal();
      setTab('hero');
      toast(`${it.icon} ${it.name} equipaggiato!`);
    });
    list.appendChild(row);
  });
  const unq = $('#btn-unequip');
  if (unq) unq.addEventListener('click', () => {
    RPG.unequipSlot(HERO, slotKey);
    persist(); closeModal(); setTab('hero');
  });
}

function renderStoryView(c) {
  const story = STORIES[HERO.storyId] || STORIES.eroe1;
  backBar(c);
  c.appendChild(el('h2', 'section-title on-parchment-title', '📜 ' + story.title));
  const p = el('div', 'panel story-panel');
  const av = avatarEl(HERO, 'story-avatar');
  p.appendChild(av);
  p.appendChild(el('div', 'story-text', esc(story.text).replace(/\n/g, ' ')));
  const talent = RPG.talentOf(HERO);
  if (talent) p.appendChild(el('div', 'talent-box',
    `${talent.icon} <b>${talent.name}</b><br><span class="small">${talent.desc}</span>`));
  c.appendChild(p);
}

function backBar(c) {
  const b = el('button', 'hero-back-pill', '‹ Eroe');
  b.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(b);
}

function renderCardsView(c) {
  backBar(c);
  const cardsTitle = el('h2', 'section-title on-parchment-title', '🎴 Il Tomo delle Memorie');
  c.appendChild(cardsTitle);
  const tomeImg = new Image();
  tomeImg.onload = () => { cardsTitle.innerHTML = `<img class="title-icon" src="assets/ui/eroe/carte.png"> Il Tomo delle Memorie`; };
  tomeImg.src = 'assets/ui/eroe/carte.png';
  c.appendChild(el('p', 'muted small center',
    `${HERO.cards.length} / ${Object.keys(RPG.CARDS).length} carte collezionate`));
  const grid = el('div', 'card-grid');
  Object.entries(RPG.CARDS).forEach(([id, card]) => {
    const owned = HERO.cards.includes(id);
    const cc = el('div', 'tcard rar-' + card.rarity + (owned ? '' : ' locked'));
    const frontHtml = `<div class="card-icon">${owned ? card.icon : '❓'}</div><b>${owned ? esc(card.name) : '???'}</b><span class="tag">${card.rarity}</span>${owned ? '<span class="tcard-tap-hint">tocca per girare</span>' : ''}`;
    const backHtml = `<div class="tcard-back-content"><div class="card-back-icon">${card.icon}</div><p class="small lore" style="text-align:center">${esc(card.lore)}</p><b class="card-back-name">${esc(card.name)}</b><span class="tag">${card.rarity}</span><span class="tcard-tap-hint">tocca per girare</span></div>`;
    cc.innerHTML = frontHtml;
    if (owned) {
      let face = 'front';
      cc.addEventListener('click', () => {
        if (cc.classList.contains('flip-out') || cc.classList.contains('flip-in')) return;
        cc.classList.add('flip-out');
        cc.addEventListener('animationend', () => {
          face = face === 'front' ? 'back' : 'front';
          cc.innerHTML = face === 'front' ? frontHtml : backHtml;
          cc.classList.remove('flip-out');
          cc.classList.add('flip-in');
          cc.addEventListener('animationend', () => cc.classList.remove('flip-in'), { once: true });
        }, { once: true });
      });
    }
    grid.appendChild(cc);
  });
  c.appendChild(grid);

  // Le Imprese — 100 traguardi raggruppati per bioma
  const claimed = HERO.achievementsClaimed || [];
  const unlockedCount = RPG.achievementsUnlocked(HERO).length;
  const pendingClaim = RPG.ACHIEVEMENTS.filter(a => HERO.level >= a.level && !claimed.includes(a.id)).length;
  c.appendChild(el('h3', 'section-title on-parchment-title small-title', '🏆 Le Imprese del Viandante'));
  c.appendChild(el('p', 'muted small center',
    `${unlockedCount} / 100 sbloccate · ${claimed.length} riscosse${pendingClaim > 0 ? ` · <b>${pendingClaim} da riscuotere!</b>` : ''}`));

  const catWrap = el('div', 'achievement-list');
  RPG.BIOMES.forEach((biome, bi) => {
    const bioAchievs = RPG.ACHIEVEMENTS.filter(a => a.level >= biome.min && a.level <= biome.max);
    if (!bioAchievs.length) return;
    const bioUnlocked = bioAchievs.filter(a => HERO.level >= a.level).length;
    const bioClaimed  = bioAchievs.filter(a => claimed.includes(a.id)).length;
    const bioPending  = bioAchievs.filter(a => HERO.level >= a.level && !claimed.includes(a.id)).length;
    const allDone = bioClaimed === bioAchievs.length;
    const isOpen = HERO.level >= biome.min;
    // Default open only for the current biome section
    const currentBiome = RPG.currentBiome(HERO.level);
    const defaultOpen = biome === currentBiome || (bioPending > 0 && bioUnlocked > 0);

    const section = el('div', 'achiev-cat-section');
    const header = el('button', 'achiev-cat-header');
    header.innerHTML = `
      <span class="achiev-cat-left">
        <span class="achiev-cat-icon">${isOpen ? biome.icon : '🔒'}</span>
        <span>
          <span class="achiev-cat-name">${isOpen ? biome.name : '???'}</span>
          <span class="achiev-cat-meta"> · Lv ${biome.min}–${biome.max} · ${bioUnlocked}/${bioAchievs.length}</span>
        </span>
      </span>
      <span>
        ${bioPending > 0 ? `<span class="achiev-cat-badge">+${bioPending} 🪙</span>` : (allDone ? `<span class="achiev-cat-badge done">✅</span>` : '')}
        <span class="achiev-cat-toggle">${defaultOpen ? '▲' : '▼'}</span>
      </span>`;

    const body = el('div', 'achiev-cat-body' + (defaultOpen ? '' : ' collapsed'));
    bioAchievs.forEach(a => {
      const unlocked = HERO.level >= a.level;
      const isClaimed = claimed.includes(a.id);
      const row = el('div', 'achievement-row' + (unlocked ? '' : ' locked') + (a.epic ? ' epic' : ''));
      const globalIdx = RPG.ACHIEVEMENTS.indexOf(a);
      const cardImg = (typeof CARD_IMGS !== 'undefined')
        ? CARD_IMGS[globalIdx % CARD_IMGS.length]
        : null;
      const iconHtml = unlocked && cardImg
        ? `<img class="achievement-card-thumb" src="${cardImg}" alt="">`
        : `<span class="achievement-icon-emoji">${unlocked ? a.icon : '🔒'}</span>`;
      row.innerHTML = `
        <div class="achievement-icon">${iconHtml}</div>
        <div class="achievement-mid">
          <b>${unlocked ? esc(a.name) : '???'}</b>
          <div class="small muted">${unlocked ? esc(a.desc) : `Sblocca al Livello ${a.level}`}</div>
        </div>
        <div class="achievement-side"></div>`;
      const side = row.querySelector('.achievement-side');
      if (isClaimed) {
        side.innerHTML = '<span class="tag">✅</span>';
      } else if (unlocked) {
        const btn = el('button', 'btn btn-small btn-primary', `🪙${a.reward.gold}`);
        btn.addEventListener('click', () => {
          const r = RPG.claimAchievement(HERO, a.id);
          persist(); renderHUD();
          if (r && r.ok) { toast(`${a.icon} Impresa riscossa! +${r.reward.gold} 🪙 +${r.reward.xp} XP`); sfx('coin'); }
          else toast(r);
          setTab('hero');
        });
        side.appendChild(btn);
      } else {
        side.innerHTML = `<span class="small muted">Liv. ${a.level}</span>`;
      }
      body.appendChild(row);
    });

    header.addEventListener('click', () => {
      const open = !body.classList.contains('collapsed');
      body.classList.toggle('collapsed', open);
      header.querySelector('.achiev-cat-toggle').textContent = open ? '▼' : '▲';
    });
    section.appendChild(header);
    section.appendChild(body);
    catWrap.appendChild(section);
  });
  c.appendChild(catWrap);
}

function showBeastDetail(b) {
  const known = (HERO.bestiary || []).includes(b.id);
  const fig = b.id === 'cavaliere-drago'
    ? `<div class="bd-emoji">${known ? '🐉' : '❓'}</div>`
    : `<img class="bd-img${known ? '' : ' bd-unknown'}" src="assets/bestiario/${b.id}.png" alt="${b.name}">`;
  modal(`<div class="beast-detail">
    <div class="bd-fig">${fig}</div>
    ${b.boss ? `<div class="bd-boss-tag"><span class="tag tag-boss">${b.final ? 'NEMESI' : 'BOSS'}</span></div>` : ''}
    <h3 class="bd-name">${known ? esc(b.name) : '???'}</h3>
    <div class="bd-zone small muted">${zoneIcon(b.zone)} ${b.zone}</div>
    ${known ? `
      <div class="bd-weak"><span class="bd-weak-label">Debolezza</span><b>${esc(b.weakness)}</b></div>
      <p class="bd-lore small">${esc(b.lore)}</p>
    ` : `<p class="bd-locked muted small">${b.boss
        ? (b.final ? 'Completa le 5 Memorie per svelarlo.' : 'Sconfiggilo nella sua missione per scoprirlo.')
        : 'Allenati in questa zona per avvistarlo.'}</p>`}
    <button class="btn wide" onclick="closeModal()">Chiudi</button>
  </div>`);
}

function renderBestiaryView(c) {
  backBar(c);
  HERO.bestiary = HERO.bestiary || [];
  const discovered = HERO.bestiary.length;
  const total = RPG.BESTIARY.length;
  c.appendChild(el('h2', 'section-title on-parchment-title', '🐉 Il Bestiario dell\'Orda'));

  /* progress bar */
  const pct = Math.round(discovered / total * 100);
  const progWrap = el('div', 'bestiary-progress');
  progWrap.innerHTML = `<div class="bestiary-prog-bar"><div class="bestiary-prog-fill" style="width:${pct}%"></div></div>
    <div class="bestiary-prog-label small muted">${discovered} / ${total} creature scoperte · ${pct}%</div>`;
  c.appendChild(progWrap);

  const zones = [...new Set(RPG.BESTIARY.map(b => b.zone))];
  const accessible = RPG.accessibleZones(HERO);
  zones.forEach(zone => {
    const inZone = RPG.BESTIARY.filter(b => b.zone === zone);
    const knownInZone = inZone.filter(b => HERO.bestiary.includes(b.id)).length;
    const isOpen = accessible.includes(zone) || knownInZone > 0;
    const zoneTitleEl = el('div', 'bestiary-zone-header');
    zoneTitleEl.innerHTML = isOpen
      ? `<span>${zoneIcon(zone)} ${zone}</span><span class="bestiary-zone-count small muted">${knownInZone}/${inZone.length}</span>`
      : `<span>🔒 Zona sconosciuta</span><span class="bestiary-zone-count small muted">0/${inZone.length}</span>`;
    c.appendChild(zoneTitleEl);
    const grid = el('div', 'bestiary-grid');
    inZone.forEach(b => {
      const known = HERO.bestiary.includes(b.id);
      const card = el('div', 'beast' + (known ? ' known' : ' unknown') + (b.boss ? ' boss' : ''));
      const imgWrap = el('div', 'beast-img-wrap');
      if (b.id === 'cavaliere-drago') {
        imgWrap.appendChild(el('div', 'beast-emoji', known ? '🐉' : '❓'));
      } else {
        const img = el('img', 'beast-img' + (known ? '' : ' beast-silhouette'));
        img.src = `assets/bestiario/${b.id}.png`;
        img.loading = 'lazy';
        imgWrap.appendChild(img);
      }
      card.appendChild(imgWrap);
      card.appendChild(el('b', 'beast-name', known ? b.name : '???'));
      if (b.boss) card.appendChild(el('span', 'tag tag-boss beast-boss-tag', b.final ? 'NEMESI' : 'BOSS'));
      if (known) card.appendChild(el('div', 'beast-weak-inline small', `⚡ ${b.weakness}`));
      card.addEventListener('click', () => showBeastDetail(b));
      grid.appendChild(card);
    });
    c.appendChild(grid);
  });
}

/* ══════════════ Modal & toast ══════════════ */
function modal(html) {
  const box = $('#modal-box');
  box.innerHTML = html;
  box.classList.remove('modal-opening');
  $('#modal').classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('modal-opening')));
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modal-box').classList.remove('modal-opening');
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

let toastTimer = null;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = el('div', ''); t.id = 'toast'; document.body.appendChild(t); }
  const emojiMatch = msg.match(/^([^\x00-\x7F\s]+)\s+([\s\S]*)$/);
  if (emojiMatch) {
    t.innerHTML = `<span class="toast-icon">${emojiMatch[1]}</span><span class="toast-text">${esc(emojiMatch[2])}</span>`;
  } else {
    t.innerHTML = `<span class="toast-text" style="padding:12px 16px">${esc(msg)}</span>`;
  }
  t.classList.remove('show');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ── Sfondo pergamena ── */
let PARCHMENT_OK = false;
(() => {
  const probe = new Image();
  probe.onload = () => {
    PARCHMENT_OK = true;
    if (CURRENT_TAB === 'hero') $('#tab-content').classList.add('bg-parchment');
  };
  probe.src = 'assets/backgrounds/pergamena.jpg';
})();

/* ── Icone UI personalizzate ── */
const UI_ICONS = {
  camp:   'assets/ui/tab-rifugio.png',
  map:    'assets/ui/tab-mappa.png',
  train:  'assets/ui/tab-allenati.png',
  market: 'assets/ui/tab-mercato.png',
  hero:   'assets/ui/tab-eroe.png',
};
const RES_ICONS = {
  gold:  'assets/ui/res-oro.png',
  wood:  'assets/ui/res-legna.png',
  stone: 'assets/ui/res-pietra.png',
};
(() => {
  Object.entries(UI_ICONS).forEach(([tab, path]) => {
    const probe = new Image();
    probe.onload = () => {
      const btn = document.querySelector(`#tabbar .tab[data-tab="${tab}"]`);
      if (!btn) return;
      const label = btn.querySelector('span');
      btn.textContent = '';
      const img = el('img', 'tab-icon');
      img.src = path;
      btn.appendChild(img);
      if (label) btn.appendChild(label);
    };
    probe.src = path;
  });
  Object.entries(RES_ICONS).forEach(([res, path]) => {
    const probe = new Image();
    probe.onload = () => {
      const span = document.getElementById('res-' + res);
      if (!span || !span.parentElement) return;
      const box = span.parentElement;
      const img = el('img', 'res-icon');
      img.src = path;
      box.innerHTML = '';
      box.appendChild(img);
      box.appendChild(document.createTextNode(' '));
      box.appendChild(span);
    };
    probe.src = path;
  });
})();


/* ═══════════ v2.7: UX & FOMO ═══════════ */

function todayISO() { return new Date().toISOString().slice(0, 10); }

/* ── Sincronizzazione da Apple Salute via Comandi Rapidi ──────
   Il Comando Rapido apre: https://.../?sync_km=5.2&sync_type=camminata
   Nessun server coinvolto: il numero arriva incollato nell'URL e il gioco
   lo applica all'eroe attualmente selezionato su QUESTO telefono. */
function showClipboardSyncBanner() {
  const banner = el('div', 'clipboard-sync-banner');
  banner.innerHTML = `
    <span class="csb-label">⚡ Passi dal Comando Rapido — tocca e incolla</span>
    <input class="csb-input" id="csb-input" type="number" inputmode="numeric" placeholder="Tocca qui → Incolla">`;
  document.body.appendChild(banner);

  const inp = document.getElementById('csb-input');
  inp.focus();
  inp.addEventListener('input', () => {
    const steps = parseInt(inp.value, 10);
    if (steps > 0) setTimeout(() => applyStepsSync(steps, banner), 300);
  });
  inp.addEventListener('paste', () => {
    setTimeout(() => {
      const steps = parseInt(inp.value, 10);
      if (steps > 0) applyStepsSync(steps, banner);
    }, 100);
  });
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 60000);
}

function applyStepsSync(steps, banner) {
  if (banner?.parentNode) banner.remove();
  if (!HERO || !(steps > 0)) return;
  const km = Math.round(steps * 0.00075 * 100) / 100;
  if (km < 0.05) { toast(`${steps} passi (${km} km) — troppo pochi.`); return; }
  const report = RPG.logHealthSync(HERO, 'camminata', km);
  if (report) { persist(); renderHUD(); showHealthSyncResult(report); maybeSyncChallenge(); }
  else toast('Attività già sincronizzata per oggi.');
}

function applyHealthSyncFromURL(hero) {
  try {
    const params = new URLSearchParams(location.search);
    // Accetta sync_steps (passi interi da HealthKit) oppure sync_km (km con virgola o punto)
    let km;
    if (params.has('sync_steps')) {
      const steps = parseInt(params.get('sync_steps'), 10);
      km = steps * 0.00075; // ~0.75 m per passo
    } else {
      km = parseFloat((params.get('sync_km') || '').replace(',', '.'));
    }
    const type = params.get('sync_type') || 'camminata';
    if (params.has('sync_km') || params.has('sync_type') || params.has('sync_steps')) {
      history.replaceState({}, '', location.pathname + location.hash);
    }
    if (!hero || !(km > 0) || !RPG.ACTIVITIES[type]) return null;
    return RPG.logHealthSync(hero, type, km);
  } catch (err) {
    console.error('Errore sincronizzazione Salute:', err);
    return null;
  }
}

function showHealthSyncResult(report) {
  if (!report || report.error) { nextOpening(); return; }
  const notable = report.levelsGained.length || report.missionComplete ||
    report.incursionComplete || report.fragments || report.sighting ||
    report.finalReveal || (report.loot && report.loot.length);
  if (notable) {
    showReport(report); // stesso popup completo degli allenamenti manuali
  } else {
    toast(`🏥 Sincronizzato da Salute: +${report.km} km, +${report.xp} XP`);
    nextOpening();
  }
}

/* ── Coda dei popup di apertura ── */
let OPEN_QUEUE = [];
function nextOpening() {
  closeModal();
  const fn = OPEN_QUEUE.shift();
  if (fn) fn();
}

/* ── Notifiche locali ── */
async function setupNotifications() {
  if (!('Notification' in window) || !HERO) return;
  updateNotifState().catch(() => {});
  checkAndNotify();
  checkMapNotify();
  checkPvpNotify();
  checkPetNotify();
  scheduleSmartNotifications();
  registerPeriodicSync();
  // Il permesso viene chiesto dopo il primo allenamento (non all'avvio)
  // Eccezione: utenti che hanno già km ma non hanno mai risposto
  if (Notification.permission === 'default' && !HERO.notifAsked && (HERO.totalKm || 0) > 0) {
    setTimeout(async () => {
      const perm = await Notification.requestPermission();
      HERO.notifAsked = true; persist();
      if (perm === 'granted') { checkAndNotify(); checkMapNotify(); checkPvpNotify(); scheduleSmartNotifications(); }
    }, 4000);
  }
}

function askNotifPermissionAfterWorkout() {
  if (!('Notification' in window) || Notification.permission !== 'default' || HERO.notifAsked) return;
  setTimeout(async () => {
    const perm = await Notification.requestPermission();
    HERO.notifAsked = true; persist();
    if (perm === 'granted') { checkAndNotify(); checkMapNotify(); checkPvpNotify(); scheduleSmartNotifications(); }
  }, 3500);
}

/* ── Notifiche schedulate (Phase 1 — locali via setTimeout) ── */
function scheduleSmartNotifications() {
  if (Notification.permission !== 'granted' || !HERO) return;
  const today = todayISO();
  // Evita di riSchedulare se l'app viene riaperta più volte nella stessa giornata
  const schedKey = 'notif_sched_' + today;
  if (localStorage.getItem(schedKey)) return;
  localStorage.setItem(schedKey, '1');

  // Pulisce chiavi di schedulazione dei giorni precedenti
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('notif_sched_') && k !== schedKey) localStorage.removeItem(k);
  }

  function scheduleAt(hour, min, fn) {
    const now = new Date();
    const fire = new Date();
    fire.setHours(hour, min, 0, 0);
    const delay = fire - now;
    if (delay > 0) setTimeout(fn, delay);
  }

  // ① Pozione del Giorno — alle 19:00 se non ancora riscattata
  scheduleAt(19, 0, () => {
    const already = HERO.dailyPotion && HERO.dailyPotion.claimedDate === todayISO();
    if (!already)
      showNotif('⚗️ Pozione non riscattata!',
        'La Pozione del Giorno ti aspetta — riscattala prima di mezzanotte!',
        'potion_unclaimed_' + todayISO());
  });

  // ② Arena — alle 22:00 se restano sfide inutilizzate
  scheduleAt(22, 0, () => {
    const left = RPG.battlesLeft(HERO);
    if (left > 0)
      showNotif("⚔️ L'Arena chiude tra 2 ore!",
        `Ti restano ancora ${left} sfide oggi — non sprecarle!`,
        'arena_closing_' + todayISO());
  });
}

/* ③ Mappa del Tesoro — controllo immediato: sei vicino a una tappa? */
function checkMapNotify() {
  if (Notification.permission !== 'granted' || !HERO) return;
  const tmStatus = RPG.treasureMapStatus(HERO);
  if (!tmStatus) return;
  const { progressKm, claimed } = tmStatus;
  const TIERS = RPG.TREASURE_MAP_TIERS;
  const nextTier = TIERS.find((t, i) => !claimed.includes(i) && progressKm < t.km);
  if (!nextTier) return;
  const kmLeft = +(nextTier.km - progressKm).toFixed(1);
  if (kmLeft > 5) return;
  showNotif('🗺️ Sei vicino a una tappa!',
    `Ti mancano solo ${kmLeft} km per il prossimo medaglione. Forza!`,
    'map_close_' + Math.floor(progressKm * 10));
}

/* ── Periodic Background Sync ── */

/* Scrive uno snapshot dello stato rilevante per le notifiche nella Cache API.
   Il service worker lo legge durante periodicsync (senza accesso a localStorage). */
async function updateNotifState() {
  if (!('caches' in window) || !HERO) return;
  const today = todayISO();
  const tmStatus = RPG.treasureMapStatus(HERO);
  let mapKmLeft = null;
  if (tmStatus) {
    const next = RPG.TREASURE_MAP_TIERS.find((t, i) =>
      !tmStatus.claimed.includes(i) && tmStatus.progressKm < t.km);
    if (next) mapKmLeft = +(next.km - tmStatus.progressKm).toFixed(1);
  }
  const pet = HERO.pet && HERO.pet.hatched ? HERO.pet : null;
  const bff = HERO.consumableBuffs || {};
  const now = Date.now();
  const hasActiveBuff = !!(
    (bff.xpMult && bff.xpMult.sessions > 0) ||
    (bff.goldMult && bff.goldMult.expiresAt > now) ||
    (bff.allBoost && bff.allBoost.expiresAt > now) ||
    bff.streakShield || bff.extraBoss || bff.dropBoost
  );
  const state = {
    date: today,
    potionClaimed: !!(HERO.dailyPotion && HERO.dailyPotion.claimedDate === today),
    battlesLeft: RPG.battlesLeft(HERO),
    mapKmLeft,
    heroName: HERO.name || '',
    petName: pet ? (pet.name || '') : null,
    petHunger: pet ? pet.hunger : null,
    petMood: pet ? pet.mood : null,
    hasActiveBuff,
  };
  const cache = await caches.open('heropace-notif-v1');
  await cache.put('/_notif-state', new Response(JSON.stringify(state),
    { headers: { 'Content-Type': 'application/json' } }));
}

/* Registra il Periodic Background Sync (Chrome Android, PWA installata) */
async function registerPeriodicSync() {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (perm.state !== 'granted') return;
    await reg.periodicSync.register('smart-notif-check', {
      minInterval: 6 * 60 * 60 * 1000 // chiede ogni 6h; il browser decide la freq reale
    });
  } catch {}
}

/* Mostra una notifica tramite service worker (funziona in background su mobile) */
async function showNotif(title, body, tag, data) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (localStorage.getItem('notif_shown_' + tag)) return;
  localStorage.setItem('notif_shown_' + tag, '1');
  const opts = { body, icon: 'assets/icons/icon.svg', badge: 'assets/icons/icon.svg', tag, data: data || {} };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) { reg.showNotification(title, opts); return; }
  } catch {}
  new Notification(title, opts);
}

/* ── Hero Share Card ─────────────────────────────────────────── */
function showHeroShareCard() {
  const existing = document.getElementById('share-overlay');
  if (existing) existing.remove();

  const pt          = pvpTitle(HERO.pvpWins || 0);
  const classEmoji  = CLASS_EMOJI[HERO.storyId] || '🧑';
  const heroTitle   = RPG.heroTitle(HERO.level);
  const km          = (HERO.totalKm || 0).toFixed(1);
  const streak      = HERO.streak && HERO.streak.count > 1 ? HERO.streak.count : 0;

  const overlay = el('div', 'share-overlay');
  overlay.id = 'share-overlay';

  const card = el('div', 'share-card');

  // Chiudi
  const closeBtn = el('button', 'share-close-btn', '✕');
  closeBtn.addEventListener('click', () => overlay.remove());
  card.appendChild(closeBtn);

  // Wordmark
  card.appendChild(el('div', 'share-wordmark', "HERO'S PACE"));
  card.appendChild(el('div', 'share-ornament-line'));

  // Avatar
  const avatarWrap = el('div', 'share-avatar-wrap');
  if (isImageAvatar(HERO)) {
    const img = el('img', 'share-avatar-img');
    img.src = HERO.avatar;
    img.alt = HERO.name;
    img.onerror = () => { img.replaceWith(el('div', 'share-avatar-emoji', classEmoji)); };
    avatarWrap.appendChild(img);
  } else {
    avatarWrap.appendChild(el('div', 'share-avatar-emoji', classEmoji));
  }
  card.appendChild(avatarWrap);

  // Nome + titolo
  card.appendChild(el('div', 'share-hero-name', esc(HERO.name)));
  const titleEl = el('div', 'share-hero-subtitle');
  titleEl.innerHTML = `Livello ${HERO.level} &nbsp;·&nbsp; <i>${esc(heroTitle)}</i>`;
  card.appendChild(titleEl);

  if (pt) {
    const ptEl = el('div', 'share-pvp-title');
    ptEl.innerHTML = `${pt.icon} ${pt.label}`;
    card.appendChild(ptEl);
  }

  // Stats
  const stats = el('div', 'share-stats');
  const addStat = (val, lbl) => {
    const s = el('div', 'share-stat');
    s.innerHTML = `<span class="share-stat-val">${val}</span><span class="share-stat-lbl">${lbl}</span>`;
    stats.appendChild(s);
  };
  addStat(km, 'km totali');
  addStat(HERO.level, 'livello');
  if (HERO.pvpWins) addStat(HERO.pvpWins, 'vittorie ⚔️');
  if (streak)       addStat(`${streak}🔥`, 'streak');
  card.appendChild(stats);

  // Tagline
  card.appendChild(el('div', 'share-divider-icon', '⚔'));
  card.appendChild(el('div', 'share-tagline', 'Riesci a battermi?'));
  card.appendChild(el('div', 'share-tagline-sub', "Sfidami su Hero's Pace"));

  // Bottoni
  const btns = el('div', 'share-btns');
  const shareText = `⚔️ ${HERO.name} — Lv ${HERO.level} — ${km} km${pt ? ` · ${pt.label}` : ''}. Riesci a battermi su Hero's Pace?`;
  const shareUrl  = APP_BASE_URL;

  if (navigator.share) {
    const shareBtn = el('button', 'btn btn-primary wide', '📤 Condividi');
    shareBtn.addEventListener('click', () => {
      navigator.share({ title: "Hero's Pace ⚔️", text: shareText, url: shareUrl }).catch(() => {});
    });
    btns.appendChild(shareBtn);
  }

  const copyBtn = el('button', 'btn wide share-copy-btn', '🔗 Copia link');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareText + '\n' + shareUrl).then(() => {
      copyBtn.textContent = '✅ Copiato!';
      setTimeout(() => { copyBtn.textContent = '🔗 Copia link'; }, 2000);
    }).catch(() => {});
  });
  btns.appendChild(copyBtn);
  card.appendChild(btns);

  overlay.appendChild(card);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function checkAndNotify() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !HERO) return;
  const today = new Date(); const todayStr = today.toISOString().slice(0, 10);
  const hour = today.getHours();
  const trainedToday = HERO.log[0] && new Date(HERO.log[0].date).toISOString().slice(0, 10) === todayStr;
  if (!trainedToday && hour >= 17)
    showNotif("Hero's Pace ⚔️", 'Il Viandante ti aspetta! Non dimenticare l\'allenamento di oggi.', 'train_' + todayStr);
  if (!trainedToday && hour >= 20 && HERO.streak && HERO.streak.count >= 3)
    showNotif('⚠️ Streak in pericolo!', `Hai una streak di ${HERO.streak.count} giorni — allena prima di mezzanotte!`, 'streak_' + todayStr);
  if (HERO.pet && HERO.pet.hatched && HERO.pet.expedition) {
    const status = RPG.expeditionStatus(HERO);
    if (status && status.ready)
      showNotif("Hero's Pace 🎒", `${HERO.pet.name} è tornato dalla spedizione con del bottino!`, 'exp_' + HERO.pet.expedition.startedAt);
  }
}

/* Controlla le sfide PvP su Firestore e notifica cambi di stato */
async function checkPvpNotify() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !HERO) return;
  const ac = HERO.cloud && HERO.cloud.activeChallenge;
  if (!ac) return;
  const ch = await FB.getChallenge(ac.id);
  if (!ch) return;

  // Avversario si è unito
  if (ch.status === 'active' && ch.opponentName) {
    const key = 'pvp_joined_' + ac.id;
    const theirName = ac.role === 'creator' ? ch.opponentName : ch.creatorName;
    showNotif('⚔️ La sfida è iniziata!', `${theirName} ha accettato la tua sfida. Che vinca il migliore!`, key);
  }

  // Scade oggi
  const today = new Date().toISOString().slice(0, 10);
  if (ch.status === 'active' && ch.endDate === today) {
    showNotif('⏳ Ultimo giorno di sfida!', 'La sfida PvP scade oggi — dai tutto quello che hai!', 'pvp_lastday_' + ac.id);
  }

  // Terminata — notifica risultato
  if (ch.status === 'completed') {
    const iWon = ch.winnerId === HERO.id;
    showNotif(
      iWon ? '🏆 Hai vinto la sfida PvP!' : '💀 Sfida PvP terminata',
      iWon ? "Apri Hero's Pace per ritirare la tua ricompensa in oro!" : "Apri Hero's Pace per vedere i risultati finali.",
      'pvp_result_' + ac.id
    );
  }
}

/* ── Riepilogo "cosa ti aspetta oggi" ── */
function showMonthlyRecap(recap) {
  const stars = recap.sessions >= 20 ? '⭐⭐⭐' : recap.sessions >= 10 ? '⭐⭐' : '⭐';
  modal(`
    <h3 class="panel-title center">📜 Recap di ${esc(recap.month)}</h3>
    <div class="monthly-recap-grid">
      <div class="recap-cell"><span class="recap-val">${recap.km}</span><span class="recap-lbl">km percorsi</span></div>
      <div class="recap-cell"><span class="recap-val">${recap.sessions}</span><span class="recap-lbl">sessioni</span></div>
      <div class="recap-cell"><span class="recap-val">${recap.xp.toLocaleString('it-IT')}</span><span class="recap-lbl">XP guadagnati</span></div>
    </div>
    <p class="center" style="font-size:1.6rem;margin:.5rem 0">${stars}</p>
    <p class="muted small center">${recap.sessions >= 20 ? 'Un mese leggendario! Il Viandante è fiero di te.' : recap.sessions >= 10 ? 'Ottimo lavoro — continua così!' : 'Ogni passo conta. Il prossimo mese andrà meglio!'}</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">Avanti!</button>
  `);
}

function showDailySummary() {
  let rows = '';
  if (HERO.incursion && !HERO.incursion.done) {
    rows += `<div class="today-row">⚡ <div><b>Incursione:</b> ${esc(HERO.incursion.name)}<br>
      <span class="small muted">${(HERO.incursion.km - HERO.incursion.progressKm).toFixed(1)} km per il forziere · <span data-cd="midnight">…</span></span></div></div>`;
  }
  if (HERO.activeMission) {
    const m = RPG.MISSIONS.find(x => x.id === HERO.activeMission.id);
    if (m) rows += `<div class="today-row">🐎 <div><b>Missione:</b> ${m.name}<br>
      <span class="small muted">mancano ${(m.km - HERO.activeMission.progressKm).toFixed(1)} km</span></div></div>`;
  }
  rows += `<div class="today-row">🎯 <div><b>Obiettivo del giorno:</b> ${RPG.dailyGoalKm(HERO.level)} km</div></div>`;
  if (HERO.streak.count > 1)
    rows += `<div class="today-row">🔥 <div><b>Streak:</b> ${HERO.streak.count} giorni di fila — non spezzarla!</div></div>`;
  const nu = nextUnlock(HERO);
  if (nu) rows += `<div class="today-row">${nu.icon} <div><b>Prossimo sblocco</b> (liv. ${nu.level}): ${nu.text}</div></div>`;
  modal(`
    <h3 class="panel-title">🌅 La tua Giornata, ${esc(HERO.name)}</h3>
    ${rows}
    <button class="btn btn-primary wide" onclick="nextOpening(); setTab('train')">⚔️ Vado ad allenarmi!</button>
    <button class="btn wide" onclick="nextOpening()">Dopo</button>
  `);
}

/* ── Prossimo sblocco in arrivo ── */
function nextUnlock(hero) {
  const c = [];
  if (hero.level < 100) {
    const nm = Math.ceil((hero.level + 1) / 5) * 5;
    const mount = RPG.MOUNTS.find(m => m.level === nm);
    if (mount) c.push({ level: nm, icon: '🐴', text: `nuova cavalcatura` });
  }
  const nb = RPG.BIOMES.find(b => b.min > hero.level);
  if (nb) c.push({ level: nb.min, icon: nb.icon, text: `nuovo bioma da esplorare` });
  const tiers = [[16, 'Epici'], [31, 'Leggendari'], [51, 'Divini'], [76, 'Oscuri']];
  const nt = tiers.find(([lv]) => lv > hero.level);
  if (nt) c.push({ level: nt[0], icon: '💎', text: `loot di rarità ${nt[1]}!` });
  if (!c.length) return null;
  c.sort((a, b) => a.level - b.level);
  const n = c[0];
  n.inLv = n.level - hero.level;
  return n;
}

/* ── Badge rossi sulla tab bar ── */
function updateBadges() {
  if (!HERO) return;
  const set = (tab, on) => {
    const b = document.querySelector(`#tabbar .tab[data-tab="${tab}"]`);
    if (!b) return;
    let d = b.querySelector('.tab-badge');
    if (on && !d) b.appendChild(el('span', 'tab-badge'));
    if (!on && d) d.remove();
  };
  set('map', !!(HERO.incursion && !HERO.incursion.done));
  set('market', HERO.forgeSeen !== todayISO());
  set('hero', Object.entries(HERO.equipment || {}).some(([s, id]) =>
    !id && (HERO.items || []).some(i => i.slot === s)));
  const dc = RPG.getDailyChallenges(HERO);
  const wc = RPG.getWeeklyChallenges(HERO);
  set('train', dc.list.some(ch => ch.progress >= ch.target && !ch.claimed)
    || wc.list.some(ch => ch.progress >= ch.target && !ch.claimed));
  const expReady = HERO.pet && HERO.pet.hatched && HERO.pet.expedition && RPG.expeditionStatus(HERO)?.ready;
  const eggReady = HERO.pet && !HERO.pet.hatched && RPG.eggProgress(HERO)?.ready;
  set('camp', !!(expReady || eggReady));
}

/* ── Countdown live (aggiornati ogni secondo) ── */
function msToMidnight() {
  const d = new Date(); const m = new Date(d);
  m.setHours(24, 0, 0, 0);
  return m - d;
}
/* ── Zaino dell'Avventuriero (consumabili) ──────────────────────────────── */
const ZAINO_CATS = [
  { id: 'tutti',     label: 'Tutti' },
  { id: 'pozioni',   label: '🍯 Pozioni' },
  { id: 'rune',      label: '🔮 Rune' },
  { id: 'utility',   label: '🧭 Utility' },
  { id: 'materiali', label: '⚒️ Materiali' },
  { id: 'biglietti', label: '🎟️ Biglietti' },
];
let ZAINO_CAT = 'tutti';

function showScratchCard(ticket) {
  const cfg = RPG.TICKET_TYPES[ticket.type];

  // Scratch subito: il risultato è già deciso (seed fisso)
  const result = RPG.scratchTicket(HERO, ticket.id);
  RPG.save({ heroes: STATE.heroes, current: STATE.current, claimedEvents: STATE.claimedEvents });
  if (result.error) { toast('Biglietto non valido.'); return; }

  const CELL_CFG = {
    comune:      { fill: '#a87010', noiseA: 'rgba(255,200,60,0.15)', noiseB: 'rgba(100,60,0,0.2)',
                   area: { l:21, r:21, t:39, b:21, gap:2.8 } },
    raro:        { fill: '#0a1a28', noiseA: 'rgba(77,217,232,0.10)', noiseB: 'rgba(0,20,40,0.35)',
                   area: { l:24, r:24, t:38, b:32, gap:3 } },
    leggendario: { fill: '#180330', noiseA: 'rgba(180,80,255,0.12)', noiseB: 'rgba(50,0,90,0.3)',
                   area: { l:24, r:24, t:42, b:30, gap:3 }, outerFlex: 1.25, innerFlex: 0.75 },
  };
  const cc = CELL_CFG[ticket.type];

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <h3 class="panel-title">🎟️ ${esc(cfg.name)}</h3>
    <p class="muted small center" style="margin-bottom:10px">Gratta le celle per scoprire il premio</p>
    <div id="sc-card" style="position:relative;width:100%;border-radius:10px;overflow:hidden;cursor:crosshair;user-select:none">
      <img id="sc-bg" src="${cfg.img}" style="display:block;width:100%;height:auto;border-radius:10px;-webkit-user-drag:none" draggable="false">
      <div id="sc-cells" style="position:absolute;display:flex;"></div>
    </div>
    <div id="sc-result" style="display:none;margin-top:14px;text-align:center"></div>
    <button class="btn btn-secondary wide" style="margin-top:14px" onclick="closeModal()">Chiudi</button>
  `;

  modal(wrap);

  // Posiziona il contenitore celle dopo il render
  requestAnimationFrame(() => {
    const cardEl  = document.getElementById('sc-card');
    const cellsEl = document.getElementById('sc-cells');
    if (!cardEl || !cellsEl) return;

    const W = cardEl.offsetWidth;
    const H = cardEl.offsetHeight;
    const a = cc.area;

    cellsEl.style.left    = a.l + '%';
    cellsEl.style.right   = a.r + '%';
    cellsEl.style.top     = a.t + '%';
    cellsEl.style.bottom  = a.b + '%';
    cellsEl.style.gap     = a.gap + '%';
    cellsEl.style.alignItems = 'stretch';

    let revealedCount = 0;
    let hintGone = false;

    result.symbols.forEach((sym, idx) => {
      const cell = document.createElement('div');
      cell.style.cssText = 'position:relative;overflow:hidden;border-radius:6px;cursor:crosshair;';
      cell.style.flex = (cc.outerFlex && idx !== 1) ? String(cc.outerFlex) : (cc.innerFlex && idx === 1) ? String(cc.innerFlex) : '1';

      const symEl = document.createElement('div');
      symEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(1.2rem,4vw,2rem);';
      symEl.textContent = sym;
      cell.appendChild(symEl);

      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      cell.appendChild(canvas);
      cellsEl.appendChild(cell);

      requestAnimationFrame(() => {
        const cW = cell.offsetWidth  || 80;
        const cH = cell.offsetHeight || 100;
        const dpr = devicePixelRatio || 1;
        canvas.width  = cW * dpr;
        canvas.height = cH * dpr;
        canvas.style.width  = cW + 'px';
        canvas.style.height = cH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = cc.fill;
        ctx.fillRect(0, 0, cW, cH);
        for (let n = 0; n < 400; n++) {
          const x = Math.random() * cW, y = Math.random() * cH, r = Math.random() * 1.4;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = Math.random() > 0.5 ? cc.noiseA : cc.noiseB;
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let y = 7; y < cH; y += 9) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke();
        }

        let revealed = false, isDown = false;
        function getPos(e) {
          const r = canvas.getBoundingClientRect();
          const src = e.touches ? e.touches[0] : e;
          return { x: src.clientX - r.left, y: src.clientY - r.top };
        }
        function scratch(x, y) {
          if (revealed) return;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        function checkReveal() {
          const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let t = 0;
          for (let p = 3; p < d.length; p += 4) if (d[p] < 128) t++;
          if (t / (canvas.width * canvas.height) >= 0.52) autoReveal();
        }
        function autoReveal() {
          if (revealed) return;
          revealed = true;
          clearInterval(timer);
          let op = 1;
          const fade = setInterval(() => {
            op -= 0.06; canvas.style.opacity = Math.max(0, op);
            if (op <= 0) {
              clearInterval(fade); canvas.style.display = 'none';
              if (++revealedCount === 3) showResult();
            }
          }, 20);
        }
        const timer = setInterval(checkReveal, 130);

        canvas.addEventListener('mousedown',  e => { isDown = true; const p = getPos(e); scratch(p.x, p.y); });
        canvas.addEventListener('mousemove',  e => { if (isDown) { const p = getPos(e); scratch(p.x, p.y); } });
        canvas.addEventListener('mouseup',    () => isDown = false);
        canvas.addEventListener('mouseleave', () => isDown = false);
        canvas.addEventListener('touchstart', e => { e.preventDefault(); isDown = true; const p = getPos(e); scratch(p.x, p.y); }, { passive: false });
        canvas.addEventListener('touchmove',  e => { e.preventDefault(); if (isDown) { const p = getPos(e); scratch(p.x, p.y); } }, { passive: false });
        canvas.addEventListener('touchend',   () => isDown = false);
      });
    });

    function showResult() {
      const resEl = document.getElementById('sc-result');
      if (!resEl) return;
      resEl.style.display = 'block';
      if (result.isWin) {
        resEl.innerHTML = `
          <div class="panel" style="background:rgba(180,140,20,0.15);border:1px solid rgba(200,160,30,0.4)">
            <div style="font-size:1.5rem;margin-bottom:6px">🎉</div>
            <b style="color:#f0c040">${esc(result.prize.label)}</b>
            ${result.prize.droppedItem ? `<div class="muted small" style="margin-top:4px">+ ${esc(result.prize.droppedItem.name)}</div>` : ''}
            ${result.prize.droppedConsumable ? `<div class="muted small" style="margin-top:4px">+ Consumabile</div>` : ''}
          </div>`;
        toast(`🎟️ ${result.prize.label}`);
      } else {
        resEl.innerHTML = `<p class="muted">Nessun premio questa volta — riprova con il prossimo biglietto!</p>`;
      }
      HERO_VIEW = 'zaino';
    }
  });
}

function renderZainoView(c) {
  const backBtn = el('button', 'btn btn-small', '↩ Torna all\'Eroe');
  backBtn.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(backBtn);
  c.appendChild(el('h2', 'section-title', '💰 Sacca del Viandante'));

  // Buff attivi
  const bff = HERO.consumableBuffs || {};
  const now = Date.now();
  const activeBufs = [];
  if (bff.xpMult)       activeBufs.push(`+${Math.round(bff.xpMult.value * 100)}% XP (${bff.xpMult.sessions} sessioni)`);
  if (bff.goldMult && bff.goldMult.expiresAt > now)   activeBufs.push(`+${Math.round(bff.goldMult.value * 100)}% oro`);
  if (bff.allBoost && bff.allBoost.expiresAt > now)   activeBufs.push(`×${1+bff.allBoost.value} tutti i bonus`);
  if (bff.streakShield) activeBufs.push(`🛡️ Streak protetta ${bff.streakShield}gg`);
  if (bff.arenaShield)  activeBufs.push(`⚔️ Scudo Arena attivo`);
  if (bff.dropBoost && bff.dropBoost.expiresAt > now) activeBufs.push(`+${Math.round(bff.dropBoost.value * 100)}% drop`);

  if (activeBufs.length) {
    const bd = el('div', 'panel buff-panel');
    bd.appendChild(el('div', 'buff-panel-title', '✨ Buff attivi'));
    const chips = el('div', 'buff-chips');
    activeBufs.forEach(t => chips.appendChild(el('span', 'buff-chip', t)));
    bd.appendChild(chips);
    c.appendChild(bd);
  }

  // Filtri categoria
  const sw = el('div', 'coll-switch');
  ZAINO_CATS.forEach(cat => {
    const b = el('button', 'coll-btn' + (ZAINO_CAT === cat.id ? ' active' : ''), cat.label);
    b.addEventListener('click', () => { ZAINO_CAT = cat.id; setTab('camp'); });
    sw.appendChild(b);
  });
  c.appendChild(sw);

  // ── Biglietti Gratta e Vinci ──
  if (ZAINO_CAT === 'tutti' || ZAINO_CAT === 'biglietti') {
    const tickets = RPG.getUnscratchedTickets(HERO);
    if (tickets.length > 0) {
      const tPanel = el('div', 'panel');
      tPanel.appendChild(el('h3', 'panel-title', '🎟️ Biglietti da Grattare'));
      const tGrid = el('div', 'ticket-grid');
      tickets.forEach(ticket => {
        const cfg = RPG.TICKET_TYPES[ticket.type];
        const card = el('div', `ticket-card ticket-${ticket.type}`);
        const img = el('img', 'ticket-thumb');
        img.src = cfg.img;
        img.alt = cfg.name;
        card.appendChild(img);
        const label = el('div', 'ticket-label', cfg.name);
        card.appendChild(label);
        const btn = el('button', 'btn btn-primary btn-small', '✨ Gratta!');
        btn.addEventListener('click', () => showScratchCard(ticket));
        card.appendChild(btn);
        tGrid.appendChild(card);
      });
      tPanel.appendChild(tGrid);
      c.appendChild(tPanel);
    }
  }

  // Griglia consumabili posseduti
  const owned = HERO.consumables || {};
  const cons  = HERO.consumables ? RPG.CONSUMABLES.filter(co => owned[co.id] > 0 && (ZAINO_CAT === 'tutti' || co.cat === ZAINO_CAT)) : [];

  if (!cons.length) {
    const empty = el('div', 'panel muted', ZAINO_CAT === 'tutti'
      ? 'Sacca vuota — combatti nell\'Arena, sconfiggi boss e visita l\'Erborista nel Mercato per ottenere consumabili.'
      : 'Nessun consumabile di questa categoria nella tua sacca.');
    c.appendChild(empty);
  } else {
    const grid = el('div', 'consumable-grid');
    cons.forEach(co => {
      const qty = owned[co.id] || 0;
      const card = el('div', `consumable-card rarity-${co.rarity}`);
      const imgWrap = el('div', 'consumable-img-wrap');
      const img = el('img', 'consumable-img');
      img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.png`;
      img.alt = co.name;
      img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
      card.appendChild(el('div', 'consumable-name', co.name));
      card.appendChild(el('div', 'consumable-desc muted small', co.desc));
      const qtyBadge = el('span', 'consumable-qty', `×${qty}`);
      card.appendChild(qtyBadge);
      const actions = el('div', 'consumable-actions');
      const useBtn = el('button', 'btn btn-primary btn-small', 'Usa');
      useBtn.addEventListener('click', () => {
        const err = RPG.useConsumable(HERO, co.id);
        if (err) { toast(err); return; }
        persist(); renderHUD();
        toast(`${co.icon} ${co.name} usato!`);
        setTab('camp');
      });
      const sellBtn = el('button', 'btn btn-small', `Vendi (${RPG.sellValueConsumable(co.id)}🪙)`);
      sellBtn.addEventListener('click', () => {
        RPG.sellConsumable(HERO, co.id);
        persist(); renderHUD();
        toast(`${co.icon} Venduto per ${RPG.sellValueConsumable(co.id)} monete.`);
        setTab('camp');
      });
      actions.appendChild(useBtn);
      actions.appendChild(sellBtn);
      card.appendChild(actions);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  // ── Crafting ──
  {
    const owned2 = HERO.consumables || {};
    const countByRarity = r => RPG.CONSUMABLES.filter(co => co.rarity === r).reduce((s, co) => s + (owned2[co.id] || 0), 0);
    const comuniN = countByRarity('comune');
    const rariN   = countByRarity('raro');
    const cp = el('div', 'panel crafting-panel');
    cp.appendChild(el('h3', 'panel-title', '⚗️ Alchimia della Sacca'));
    cp.appendChild(el('p', 'muted small', 'Combina 3 consumabili della stessa rarità per ottenerne uno della rarità superiore.'));
    const rows = [
      { from: 'comune', to: 'raro',   count: comuniN, label: '3 Comuni → 1 Raro',   canDo: comuniN >= 3 },
      { from: 'raro',   to: 'epico',  count: rariN,   label: '3 Rari → 1 Epico',    canDo: rariN >= 3   },
    ];
    rows.forEach(row => {
      const r = el('div', 'crafting-row');
      r.innerHTML = `<span class="crafting-label">${row.label}</span><span class="crafting-have muted small">(ne hai ${row.count})</span>`;
      const btn = el('button', `btn btn-small${row.canDo ? ' btn-primary' : ''}`, '⚗️ Crea');
      btn.disabled = !row.canDo;
      btn.addEventListener('click', () => {
        const result = RPG.craftConsumable(HERO, row.from);
        if (typeof result === 'string') { toast(result); return; }
        persist(); renderHUD();
        toast(`⚗️ Creato: ${result.icon} ${result.name}!`);
        setTab('hero');
      });
      r.appendChild(btn);
      cp.appendChild(r);
    });
    c.appendChild(cp);
  }

  // ── Achievements consumabili ──
  {
    const unlocked = RPG.consumableAchievementsUnlocked(HERO);
    if (unlocked.length) {
      const ap = el('div', 'panel crafting-panel');
      ap.appendChild(el('h3', 'panel-title', '🏅 Traguardi della Sacca'));
      unlocked.forEach(a => {
        const claimed = (HERO.achievementsClaimed || []).includes(a.id);
        const row = el('div', 'crafting-row');
        row.innerHTML = `<span class="crafting-label">${a.icon} ${esc(a.name)}</span><span class="muted small">${esc(a.desc)}</span>`;
        if (!claimed) {
          const btn = el('button', 'btn btn-primary btn-small', `🎁 +${a.reward.gold}🪙`);
          btn.addEventListener('click', () => {
            const r = RPG.claimAchievement(HERO, a.id);
            if (typeof r === 'string') { toast(r); return; }
            persist(); renderHUD();
            toast(`🏅 ${a.name} riscattato! +${a.reward.gold}🪙 +${a.reward.xp}⭐`);
            setTab('hero');
          });
          row.appendChild(btn);
        } else {
          row.appendChild(el('span', 'challenge-check', '✓'));
        }
        ap.appendChild(row);
      });
      c.appendChild(ap);
    }
  }

  // Tutti i consumabili esistenti (catalogo) se zaino vuoto
  if (!Object.keys(owned).length) {
    c.appendChild(el('h3', 'section-title', '📖 Catalogo Consumabili'));
    const catGrid = el('div', 'consumable-grid');
    RPG.CONSUMABLES.filter(co => ZAINO_CAT === 'tutti' || co.cat === ZAINO_CAT).forEach(co => {
      const card = el('div', `consumable-card rarity-${co.rarity} locked`);
      const imgWrap = el('div', 'consumable-img-wrap');
      const img = el('img', 'consumable-img');
      img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.png`;
      img.alt = co.name;
      img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
      card.appendChild(el('div', 'consumable-name', co.name));
      card.appendChild(el('div', 'consumable-desc muted small', co.desc));
      card.appendChild(el('span', 'consumable-rarity-badge', co.rarity));
      catGrid.appendChild(card);
    });
    c.appendChild(catGrid);
  }
}

/* ── La Serra del Viandante ─────────────────────────────────────────────── */
function renderSerraView(c) {
  c.classList.add('in-serra');

  const serraBanner = el('div', 'serra-hero-banner');
  c.appendChild(serraBanner);

  const backBtn = el('button', 'btn btn-small serra-back-btn', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { c.classList.remove('in-serra'); CAMP_VIEW = 'main'; setTab('camp'); });
  serraBanner.appendChild(backBtn);

  const serraTitle = el('h2', 'section-title serra-banner-title', '🌿 La Serra del Viandante');
  serraBanner.appendChild(serraTitle);

  // NPC Messer Ortica — prima visita
  if (!HERO.greenhouse.metNpc) {
    HERO.greenhouse.metNpc = true;
    persist();
    modal(`<div class="npc-dialogue-modal">
      <img src="assets/minigames/serra/messer-ortica.png" class="npc-portrait-fullbody" alt="Messer Ortica">
      <h3 class="panel-title" style="margin-top:8px">Messer Ortica</h3>
      <p class="muted small center" style="margin-bottom:12px"><i>Gnomo giardiniere della Serra</i></p>
      <p>"Benvenuto, Viandante! Questa è la tua Serra personale. Ogni km che corri diventa Sudore Vitale — la nostra acqua magica."</p>
      <p>"Ricorda le tre leggi del giardiniere:"</p>
      <ul style="text-align:left;padding-left:1.2rem;line-height:1.8">
        <li>💧 <b>Annaffia ogni giorno</b> — le piante assetate perdono Salute.</li>
        <li>❤️ <b>Tieni d'occhio la Salute</b> — a 0% la pianta marcisce.</li>
        <li>🎁 <b>Raccogli subito</b> quando è pronta — non aspettare troppo!</li>
      </ul>
      <button class="btn btn-primary wide" onclick="nextOpening()">Ho capito, Messer Ortica!</button>
    </div>`);
  }

  // Banner permanente Messer Ortica
  c.appendChild(npcBanner('assets/minigames/serra/messer-ortica.png', 'Messer Ortica',
    '"Corri, annaffia, raccogli. La Serra non dimentica chi la cura."'));

  const kmToday = RPG.todayKm(HERO);
  const waterAvail = Math.max(0, kmToday - (HERO.greenhouse.waterUsedToday || 0));
  const tank = el('div', 'water-tank-panel');
  tank.innerHTML = `<span class="water-drop-icon">💧</span>
    <div>
      <div class="water-tank-title">Riserva di Sudore (oggi)</div>
      <div class="water-tank-val"><b>${waterAvail.toFixed(1)} km</b> disponibili per l'irrigazione</div>
    </div>`;
  c.appendChild(tank);

  const PLANT_IMGS = {
    muschio:  "assets/minigames/serra/muschio soffice di oakhaven.png",
    mentuccia:"assets/minigames/serra/mentuccia di oakhaven.jpeg",
    bosso:    "assets/minigames/serra/bosso scudo delle pianure.png",
    cactus:   "assets/minigames/serra/cactus di cenere.png",
    giglio:   "assets/minigames/serra/giglio della pioggia.png",
    orchidea: "assets/minigames/serra/orchidea del vento.png",
    edera:    "assets/minigames/serra/edera vampira.png",
    girasole: "assets/minigames/serra/girasole radiante.png",
    bonsai:   "assets/minigames/serra/Bonsai di Yggdrasil.png",
    loto:     "assets/minigames/serra/loto dell'abisso.png",
  };
  const plantIcon = (seedId, fallback) => {
    const src = PLANT_IMGS[seedId];
    return src ? `<img src="${src}" class="pot-img" alt="">` : fallback;
  };

  const grid = el('div', 'greenhouse-grid');
  HERO.greenhouse.pots.forEach((pot, i) => {
    const pEl = el('div', 'pot-card' + (pot.status === 'locked' ? ' locked' : ''));

    if (pot.status === 'locked') {
      const unlockLvl = [0, 10, 30, 50, 70][i] || 10;
      pEl.innerHTML = `<div class="pot-emoji">🔒</div>
        <div class="pot-name">Sblocca al Liv. ${unlockLvl}</div>`;

    } else if (pot.status === 'empty') {
      pEl.innerHTML = `<div class="pot-emoji"><img src="assets/minigames/serra/vaso vuoto.png" class="pot-img" alt=""></div>
        <div class="pot-name">Vaso Vuoto</div>
        <div class="muted small">Tocca per piantare</div>`;
      pEl.classList.add('pickable');
      pEl.addEventListener('click', () => showSeedPicker(i));

    } else if (pot.status === 'dead') {
      pEl.innerHTML = `<div class="pot-emoji">🥀</div>
        <div class="pot-name danger">Pianta morta</div>`;
      const cleanBtn = el('button', 'btn btn-small wide', 'Pulisci vaso');
      cleanBtn.addEventListener('click', () => {
        Object.assign(pot, { status:'empty', seedId:null, daysGrown:0, health:100, water:0, readyDays:0 });
        persist(); setTab('camp');
      });
      pEl.appendChild(cleanBtn);

    } else if (pot.status === 'ready') {
      const pData = RPG.PLANTS[pot.seedId];
      const rdDays = pot.readyDays || 0;
      const baseVal = (RPG.RARITIES[pData.rarity] || {}).value || 50;
      const maturPreview = rdDays > 0 ? Math.round(baseVal * 0.2 * Math.min(3, rdDays)) : 0;
      let maturLine = '';
      if (rdDays === 0) maturLine = `<div class="matur-hint">🌿 Aspetta 1-3 giorni per bonus stagionatura!</div>`;
      else if (rdDays < 4) maturLine = `<div class="matur-hint matur-ripe">⭐ Stagionata ${rdDays} giorno${rdDays > 1 ? 'i' : ''} — bonus +${maturPreview} oro!</div>`;
      pEl.innerHTML = `<div class="pot-emoji glow">${plantIcon(pot.seedId, pData.icon)}</div>
        <div class="pot-name" style="color:var(--gold-bright)">Fioritura Perfetta!</div>
        ${maturLine}`;
      const harBtn = el('button', 'btn btn-primary wide btn-small', '🎁 Raccogli');
      harBtn.addEventListener('click', () => {
        const rew = RPG.harvestPlant(HERO, i);
        if (!rew) return;
        persist(); renderHUD();
        const itemLine = rew.items.length ? `<br>🎒 ${rew.items.map(it => `${it.icon} ${esc(it.name)}`).join(', ')}` : '';
        const goldLine = rew.gold ? `<br>🪙 +${rew.gold} oro` : '';
        const maturBonusLine = rew.maturBonus > 0 ? `<br><span style="color:var(--gold-bright)">⭐ Bonus stagionatura: +${rew.maturBonus} oro!</span>` : '';
        const resLine  = rew.wood  ? `<br>🪵 +${rew.wood} legno · 🪨 +${rew.stone} pietra` : '';
        modal(`<h3 class="panel-title">✨ Raccolto!</h3>
          <p class="center" style="font-size:2.5rem">${pData.icon}</p>
          <p class="center"><b>${esc(pData.name)}</b></p>
          <p class="center muted small">${goldLine}${maturBonusLine}${resLine}${itemLine}</p>
          <button class="btn btn-primary wide" onclick="closeModal();setTab('camp');">Fantastico!</button>`);
        sfx('coin'); vibrate([60, 30, 100]);
      });
      pEl.appendChild(harBtn);

    } else if (pot.status === 'growing') {
      const pData = RPG.PLANTS[pot.seedId];
      const growPct = Math.min(100, Math.round(pot.daysGrown / pData.days * 100));
      const hpPct   = Math.round(Math.max(0, pot.health));
      const hpColor = hpPct > 60 ? 'var(--emerald)' : hpPct > 30 ? '#ff9a3c' : '#e05050';
      pEl.innerHTML = `
        <div class="pot-emoji">${growPct < 50 ? '🌱' : plantIcon(pot.seedId, pData.icon)}</div>
        <div class="pot-name">${esc(pData.name)}</div>
        <div class="pot-stats">
          <div class="pot-stat-label muted small">❤️ Salute</div>
          <div class="pot-stat-bar"><div class="pot-fill-hp" style="width:${hpPct}%;background:${hpColor}"></div></div>
          <div class="pot-stat-label muted small">🌱 Crescita — ${growPct}%</div>
          <div class="pot-stat-bar"><div class="pot-fill-xp" style="width:${growPct}%"></div></div>
        </div>
        <div class="pot-water-info">Versati oggi: <b>${(pot.water || 0).toFixed(1)} / ${pData.water} km</b></div>`;
      const waterBtn = el('button', 'btn btn-primary wide btn-small', '💧 Annaffia (1 km)');
      waterBtn.disabled = waterAvail < 1;
      waterBtn.addEventListener('click', () => {
        const err = RPG.waterPlant(HERO, i, 1);
        if (err) { toast(err); return; }
        persist(); setTab('camp');
        sfx('block');
      });
      pEl.appendChild(waterBtn);
      // Fertilizzante: mostra bottone se ne possiede uno
      const fertItems = (HERO.items || []).filter(it => it.slot === 'consumabile' && it.name === 'Fertilizzante Magico');
      if (fertItems.length) {
        const fertBtn = el('button', 'btn btn-small wide', `🌿 Fertilizza (${fertItems.length})`);
        fertBtn.addEventListener('click', () => {
          const err2 = RPG.useFertilizer(HERO, fertItems[0].id, i);
          if (err2) { toast(err2); return; }
          persist(); setTab('camp');
          toast('🌿 Fertilizzante usato — la pianta è cresciuta di 1 giorno!');
        });
        pEl.appendChild(fertBtn);
      }
    }

    grid.appendChild(pEl);
  });
  c.appendChild(grid);

  // Missioni Serra settimanali
  RPG.rolloverSerraMissions(HERO);
  const wm = HERO.greenhouse.weeklyMissions;
  if (wm && wm.missions) {
    const missSection = el('div', 'serra-missions-panel');
    missSection.innerHTML = `<div class="panel-title" style="margin-bottom:8px">📋 Missioni Settimanali</div>`;
    wm.missions.forEach(m => {
      const done = m.progress >= m.target;
      const pct = m.type === 'harvest_rarity' ? (done ? 100 : 0)
        : Math.min(100, Math.round(m.progress / m.target * 100));
      const targetDisp = m.type === 'harvest_rarity' ? '1' : (typeof m.target === 'number' ? m.target.toFixed(m.type === 'water_km' ? 0 : 0) : '—');
      const progDisp = m.type === 'harvest_rarity' ? (done ? '1' : '0') : m.progress.toFixed(m.type === 'water_km' ? 1 : 0);
      const rewardLabel = `🪙 ${m.reward.gold}${m.reward.item === 'seme' ? ' + 🌰 Seme' : m.reward.item === 'fertilizzante' ? ' + 🌿 Fertilizzante' : ''}`;
      const mEl = el('div', `serra-mission-card${done ? ' done' : ''}${m.claimed ? ' claimed' : ''}`);
      mEl.innerHTML = `
        <div class="sm-label">${m.label}</div>
        <div class="sm-desc muted small">${esc(m.desc)}</div>
        <div class="sm-progress-row">
          <div class="sm-bar"><div class="sm-fill" style="width:${pct}%"></div></div>
          <span class="sm-fraction">${progDisp}/${targetDisp}</span>
        </div>
        <div class="sm-reward muted small">${rewardLabel}</div>`;
      if (done && !m.claimed) {
        const claimBtn = el('button', 'btn btn-primary btn-small', '🎁 Riscatta');
        claimBtn.addEventListener('click', () => {
          const res = RPG.claimSerraMission(HERO, m.id);
          if (typeof res === 'string') { toast(res); return; }
          persist(); renderHUD(); setTab('camp');
          const itLine = res.items.length ? res.items.map(it => `${it.icon} ${esc(it.name)}`).join(', ') : '';
          const consLine = res.consumable ? ` · 💰 ${res.consumable.icon} ${esc(res.consumable.name)}` : '';
          toast(`🎁 Missione completata! +${res.gold} oro${itLine ? ' · ' + itLine : ''}${consLine}`);
        });
        mEl.appendChild(claimBtn);
      } else if (m.claimed) {
        mEl.appendChild(el('div', 'sm-claimed-badge', '✓ Riscattata'));
      }
      missSection.appendChild(mEl);
    });
    c.appendChild(missSection);
  }

  // Glossario tratti
  const loreBtn = el('button', 'btn btn-small', '📖 Proprietà delle Piante');
  loreBtn.style.marginTop = '12px';
  loreBtn.addEventListener('click', () => {
    const rows = Object.values(RPG.PLANTS).map(p =>
      `<div class="loot rar-${p.rarity}" style="margin-bottom:6px">
        <div class="loot-head"><b>${p.icon} ${esc(p.name)}</b> <span class="tag">${RPG.RARITIES[p.rarity].label}</span></div>
        <div class="small muted">${esc(p.desc)}<br>💧 ${p.water} km/giorno · ${p.days} giorni</div>
      </div>`).join('');
    modal(`<h3 class="panel-title">📖 Piante della Serra</h3>
      <div class="loot-list" style="max-height:55vh;overflow-y:auto">${rows}</div>
      <button class="btn wide" onclick="closeModal()">Chiudi</button>`);
  });
  c.appendChild(loreBtn);
}

function showSeasonModal() {
  const season = RPG.currentSeason();
  const allSeasons = Object.values(RPG.SEASONS);
  const d = new Date();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - d.getDate();

  const bonusRows = season.bonuses.map(b => `<li>${esc(b)}</li>`).join('');
  const seasonCards = allSeasons.map(s => {
    const active = s.id === season.id;
    return `<div class="season-mini-card${active ? ' active' : ''}">
      <span class="smc-icon">${s.icon}</span>
      <span class="smc-name">${esc(s.name)}</span>
    </div>`;
  }).join('');

  RPG.initSeasonalChallenge(HERO);
  const sc = HERO.seasonalChallenge;
  const scPct = sc ? Math.min(100, Math.round(sc.progressKm / sc.km * 100)) : 0;

  modal(`
    <div class="season-modal">
      <div class="season-modal-header" style="--season-color:${season.color}">
        <span class="season-modal-icon">${season.icon}</span>
        <div>
          <h3 style="margin:0">${esc(season.name)}</h3>
          <div class="muted small">${daysLeft} giorni rimanenti questo mese</div>
        </div>
      </div>
      <div class="season-cards-row">${seasonCards}</div>
      <p class="muted small" style="margin:10px 0 6px">${esc(season.desc)}</p>
      <div class="sm-label" style="margin-bottom:4px">Bonus Attivi:</div>
      <ul class="season-bonus-list">${bonusRows}</ul>
      ${sc ? `
      <div class="sm-label" style="margin:10px 0 4px">🏆 ${esc(sc.label)}</div>
      <div class="sm-progress-row">
        <div class="sm-bar"><div class="sm-fill" style="width:${scPct}%;background:${season.color}"></div></div>
        <span class="sm-fraction">${sc.progressKm.toFixed(1)} / ${sc.km} km</span>
      </div>
      <div class="muted small" style="margin-top:4px">Ricompensa: oggetto ${RPG.RARITIES[season.challenge.reward].label} stagionale</div>
      ` : ''}
    </div>
    ${sc && scPct >= 100 && !sc.claimed ? `<button class="btn btn-primary wide" style="margin-top:12px" id="sc-claim-btn">🎁 Riscatta Ricompensa Stagionale</button>` : ''}
    <button class="btn wide" style="margin-top:8px" onclick="closeModal()">Chiudi</button>
  `);
  if (sc && scPct >= 100 && !sc.claimed) {
    document.getElementById('sc-claim-btn').addEventListener('click', () => {
      const res = RPG.claimSeasonalChallenge(HERO);
      if (typeof res === 'string') { toast(res); return; }
      persist(); renderHUD(); closeModal();
      modal(`<h3 class="panel-title">${season.icon} Sfida Stagionale Completata!</h3>
        <p class="center muted small">Hai conquistato:</p>
        <div class="loot rar-${res.item.rarity}" style="margin:12px 0">
          <div class="loot-head"><b>${res.item.icon} ${esc(res.item.name)}</b>
          <span class="tag">${RPG.RARITIES[res.item.rarity].label}</span></div>
        </div>
        <button class="btn btn-primary wide" onclick="closeModal()">Magnifico!</button>`);
      sfx('coin'); vibrate([80, 40, 120]);
    });
  }
}

function showSeedPicker(potIndex) {
  modal(`<h3 class="panel-title">🪴 Pianta un Seme</h3>
    <div class="loot-list" id="seed-picker-list"></div>
    <button class="btn wide" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);

  const list = $('#seed-picker-list');

  // Semi in inventario (slot 'seme') — usa e consuma
  const invSeeds = (HERO.items || []).filter(it => it.slot === 'seme');
  if (invSeeds.length) {
    list.appendChild(el('div', 'small muted', '🌰 Semi nel tuo zaino — partono pre-germinati (+1 giorno bonus):'));
    invSeeds.forEach(seed => {
      const plant = RPG.PLANTS[seed.seedId];
      const row = el('div', `loot rar-${seed.rarity} pickable`);
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="loot-head">
          <img src="${seed.img}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;margin-right:6px" onerror="this.style.display='none'">
          <b>${plant ? plant.icon + ' ' + esc(plant.name) : esc(seed.name)}</b>
          <span class="tag">${RPG.RARITIES[seed.rarity].label}</span>
        </div>
        <div class="small muted">${plant ? esc(plant.desc) + '<br>💧 ' + plant.water + ' km/giorno · ' + plant.days + ' giorni' : esc(seed.desc)}</div>`;
      row.addEventListener('click', () => {
        const err = RPG.useSeedItem(HERO, seed.id, potIndex);
        if (err) { toast(err); return; }
        persist(); closeModal(); setTab('camp');
        toast(`🌱 Hai piantato ${plant ? plant.name : seed.name}!`);
      });
      list.appendChild(row);
    });
    list.appendChild(el('div', 'small muted', '— oppure pianta liberamente: —'));
  }

  // Tutte le piante (selezione libera)
  Object.values(RPG.PLANTS).forEach(p => {
    const row = el('div', `loot rar-${p.rarity} pickable`);
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div class="loot-head"><b>${p.icon} ${esc(p.name)}</b> <span class="tag">${RPG.RARITIES[p.rarity].label}</span></div>
      <div class="small muted">${esc(p.desc)}<br>💧 Richiede <b>${p.water} km/giorno</b> per <b>${p.days} giorni</b></div>`;
    row.addEventListener('click', () => {
      const err = RPG.plantSeeds(HERO, potIndex, p.id);
      if (err) { toast(err); return; }
      persist(); closeModal(); setTab('camp');
      toast(`🌱 Hai piantato ${p.name}!`);
    });
    list.appendChild(row);
  });
}

function msToWeekEnd() {
  const d = new Date(); const m = new Date(d);
  const dow = (d.getDay() + 6) % 7; // 0 = lunedì
  m.setDate(d.getDate() + (7 - dow));
  m.setHours(0, 0, 0, 0);
  return m - d;
}
function fmtMs(ms) {
  const h = Math.floor(ms / 3600000), mm = Math.floor(ms % 3600000 / 60000);
  if (h >= 48) return Math.floor(h / 24) + ' giorni';
  if (h >= 1) return h + 'h ' + mm + 'm';
  const s = Math.floor(ms % 60000 / 1000);
  return mm + 'm ' + s + 's';
}
function msToMappaInfuocata() {
  const mi = HERO && HERO.mappaInfuocata;
  if (!mi || mi.status !== 'active' || !mi.activatedAt) return 0;
  return Math.max(0, 86400000 - (Date.now() - mi.activatedAt));
}
setInterval(() => {
  document.querySelectorAll('[data-cd]').forEach(e => {
    const cd = e.dataset.cd;
    e.textContent = '⏳ ' + fmtMs(
      cd === 'week' ? msToWeekEnd() :
      cd === 'mi'   ? msToMappaInfuocata() :
      msToMidnight()
    );
  });
}, 1000);

/* Rollover automatico se l'app resta aperta a cavallo della mezzanotte */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !HERO) return;
  const serraLogs = RPG.rolloverGreenhouse(HERO);
  RPG.rolloverIncursion(HERO);
  if (serraLogs && serraLogs.length) { persist(); renderHUD(); }
  else if (HERO.greenhouse && HERO.greenhouse.lastTick === todayISO()) { /* già aggiornato */ }
  else { persist(); renderHUD(); }
});

/* ── Anteprima dei biomi (anche bloccati: hype!) ── */
function showBiomePreview(b, open) {
  const enemies = RPG.BESTIARY.filter(x => x.zone === b.name);
  let beasts = '';
  if (enemies.length) {
    beasts = `<p class="small muted center">Creature avvistate da queste parti:</p><div class="preview-beasts">` +
      enemies.map(x => {
        const known = HERO.bestiary.includes(x.id);
        return x.id === 'cavaliere-drago'
          ? `<div class="preview-beast">❓</div>`
          : `<img class="preview-beast${known && open ? '' : ' shadow'}" src="assets/bestiario/${x.id}.png">`;
      }).join('') + `</div>`;
  } else {
    beasts = `<p class="small muted center">Nessuno è mai tornato per raccontare quali creature si aggirino qui…</p>`;
  }
  const slug = RPG.biomeSlug(b);
  const figHtml = slug
    ? `<img class="preview-diorama${open ? '' : ' locked-diorama'}" src="assets/biomi/${slug}.jpg" onerror="this.outerHTML='<p class=&quot;center&quot; style=&quot;font-size:3rem&quot;>${b.icon}</p>'">`
    : `<p class="center" style="font-size:3rem">${b.icon}</p>`;
  modal(`
    ${figHtml}
    <h3 class="panel-title center">${b.name}</h3>
    <p class="center small"><span class="tag">Livelli ${b.min}–${b.max}</span></p>
    ${beasts}
    ${open
      ? `<p class="center small">✅ Bioma raggiunto: le sue missioni sono sulla Mappa.</p>`
      : `<p class="center"><b>🔒 Si apre al Livello ${b.min}</b><br><span class="small muted">Ti mancano ${b.min - HERO.level} livelli. Continua ad allenarti!</span></p>`}
    <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>
  `);
}

/* ── Suoni (WebAudio, niente file esterni) ── */
let _AC = null;
function sfx(kind) {
  try {
    _AC = _AC || new (window.AudioContext || window.webkitAudioContext)();
    if (_AC.state === 'suspended') _AC.resume();
    const t = _AC.currentTime;
    const nota = (freq, start, dur, type = 'triangle', vol = 0.12) => {
      const o = _AC.createOscillator(), g = _AC.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t + start);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      o.connect(g).connect(_AC.destination);
      o.start(t + start); o.stop(t + start + dur);
    };
    if (kind === 'coin')  { nota(880, 0, .12); nota(1318, .07, .18); }
    if (kind === 'level') { [523, 659, 784, 1047].forEach((f, i) => nota(f, i * .1, .3)); }
    if (kind === 'chest') {
      nota(160, 0, .25, 'sawtooth', .18);
      [784, 988, 1175, 1568].forEach((f, i) => nota(f, .3 + i * .08, .35));
    }
    if (kind === 'hit')   { nota(220, 0, .1, 'sawtooth', .22); nota(110, .03, .16, 'square', .18); }
    if (kind === 'lose')  { nota(330, 0, .14, 'sawtooth', .2); nota(180, .1, .22, 'sawtooth', .18); }
    if (kind === 'block') { nota(500, 0, .06, 'square', .14); nota(400, .05, .09, 'square', .1); }
    if (kind === 'defeat'){ [440, 349, 262, 196].forEach((f, i) => nota(f, i * .16, .4, 'sawtooth', .16)); }
  } catch {}
}

/* ══════════════ Avvio ══════════════
   IMPORTANTE: questo blocco deve restare l'ULTIMA cosa nel file.
   Se venisse eseguito prima che tutte le dichiarazioni `let`/`const`
   di livello superiore (OPEN_QUEUE, BATTLE, ecc.) siano state
   valutate, chi riapre l'app con un eroe già selezionato manderebbe
   in crash l'intero script a metà (Temporal Dead Zone), lasciando
   funzionalità come l'Arena rotte per tutta la sessione. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

function runSplash(done) {
  const fill  = document.getElementById('splash-progress-fill');
  const text  = document.getElementById('splash-progress-text');
  const splash = document.getElementById('screen-splash');

  const MSGS = [
    'Sellando il cavallo…',
    'Affilando la lama…',
    'Accendendo il fuoco del campo…',
    'Controllando le provviste…',
    'Studiando la mappa…',
    'Lucidando l\'armatura…',
    'Consultando le stelle…',
    'Raccogliendo erbe medicinali…',
    'Preparando la forgia…',
    'Risvegliando il famiglio…',
  ];
  let msgIdx = 0;
  if (text) text.textContent = MSGS[0];
  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % MSGS.length;
    if (text) text.textContent = MSGS[msgIdx];
  }, 370);

  const DURATION = 2100, STEP = 30;
  let s = 0, total = DURATION / STEP;
  const timer = setInterval(() => {
    s++;
    // easeOutCubic — decolla veloce, rallenta verso la fine
    const pct = Math.round((1 - Math.pow(1 - s / total, 3)) * 100);
    if (fill) fill.style.width = pct + '%';
    if (s >= total) {
      clearInterval(timer);
      clearInterval(msgTimer);
      if (text) text.textContent = 'Pronti!';
      setTimeout(() => {
        splash.classList.add('splash-fadeout');
        setTimeout(() => { splash.classList.add('hidden'); done(); }, 420);
      }, 220);
    }
  }, STEP);
}

runSplash(() => {
  if (STATE.current && STATE.heroes.find(h => h.id === STATE.current)) enterGame();
  else renderProfiles();
});

/* ── Guida al Gioco ─────────────────────────────────────────────────────── */
function renderGuidaView(c) {
  const back = el('button', 'hero-back-pill', '‹ Impostazioni');
  back.addEventListener('click', () => { HERO_VIEW = 'settings'; setTab('hero'); });
  c.appendChild(back);
  c.appendChild(el('h2', 'section-title', '📖 Guida al Gioco'));

  const sections = [
    {
      icon: '🏃', title: 'Come funziona',
      body: `RPGym trasforma i tuoi allenamenti reali in progressione RPG. Ogni volta che vai in palestra o fai sport, registri l'attività nella scheda <b>Allenati</b>: inserisci tipo di esercizio, durata e km percorsi (se applicabile). Il gioco calcola XP e oro in base all'intensità e alla durata. Più ti alleni, più il tuo eroe cresce.`,
    },
    {
      icon: '⭐', title: 'Livelli e Titoli',
      body: `Ogni allenamento ti dà XP. Accumulando abbastanza XP sali di livello (da 1 a 100) e sblocchi un titolo sempre più epico — da <i>Novizio del Sudore</i> fino a <i>Leggenda Vivente</i>. Salendo di livello si sbloccano nuovi biomi sulla Mappa del Mondo e nuove cavalcature ogni 5 livelli.`,
    },
    {
      icon: '🔥', title: 'Streak',
      body: `Allenarti più giorni di fila costruisce la tua streak. Ogni giorno consecutivo aumenta il contatore. Se salti un giorno perdi tutto — a meno che tu non usi uno <b>Scudo della Serie</b> dalla Sacca del Viandante. La streak settimanale (7 giorni) ti regala un consumabile bonus.`,
    },
    {
      icon: '🛡️', title: 'Equipaggiamento',
      body: `Il tuo eroe ha 8 slot: Arma, Scudo, Elmo, Armatura, Anello, Amuleto, Seme e Consumabile. Ogni oggetto equipaggiato aggiunge un bonus percentuale all'XP guadagnato in allenamento. Gli oggetti si trovano nei forzieri, come premi delle sfide o nell'Arena. Le rarità sono: <span style="color:#b0b8c1">Comune</span>, <span style="color:#4a90d9">Raro</span>, <span style="color:#9b59b6">Epico</span>, <span style="color:#f1c40f">Leggendario</span>.`,
    },
    {
      icon: '🗺️', title: 'Mappa del Tesoro',
      body: `Ogni settimana si resetta una mappa con 3 tappe a distanza crescente (8 km, 22 km, 45 km). I km degli allenamenti si accumulano automaticamente. Raggiunta una tappa puoi riscuotere oro, risorse e — con un po' di fortuna — un consumabile. La tappa finale garantisce anche un oggetto equipaggiabile.`,
    },
    {
      icon: '⚔️', title: 'Arena',
      body: `Ogni giorno hai un certo numero di sfide disponibili nell'Arena (tab <b>Mappa</b>). Sfidi nemici in un duello a morra: Attacco, Difesa e Schivata si battono secondo regole RPG. Vincendo guadagni oro, XP arena e — con probabilità variabile — un consumabile. I boss sono avversari speciali con ricompense maggiori. La difficoltà scala con il tuo livello.`,
    },
    {
      icon: '👹', title: 'Boss Settimanale',
      body: `Ogni settimana appare un boss unico sulla Mappa. Per sconfiggerlo devi percorrere un certo numero di km (es. 30 km per il Troll delle Paludi). Una volta raggiunta la soglia, riscuoti il bottino: oro, un oggetto equipaggiabile e un consumabile raro garantito.`,
    },
    {
      icon: '🎯', title: 'Sfide Giornaliere e Settimanali',
      body: `Nella scheda <b>Allenati</b> trovi ogni giorno 3 sfide (es. "Percorri 5 km", "Registra 2 allenamenti") e ogni settimana 3 sfide più impegnative. Completare tutte le sfide di una categoria sblocca un <b>bonus totale</b> con ricompense extra. Ogni sfida completata ha il 25% (giornaliere) o 30% (settimanali) di probabilità di dropparti un consumabile.`,
    },
    {
      icon: '🏕️', title: 'Rifugio',
      body: `Il tuo campo base cresce con te. Sblocca e potenzia strutture spendendo oro, legno e pietra. Ogni struttura aggiunge bonus passivi permanenti (più monete, più XP, ecc.). La scena cambia visivamente con il tuo livello e con il ciclo giorno/notte in tempo reale.`,
    },
    {
      icon: '🌱', title: 'Serra del Viandante',
      body: `Pianta semi nel tuo orto e raccoglili dopo alcuni giorni reali. Ogni pianta ha una rarità e un tratto speciale che potenzia temporaneamente il tuo eroe quando viene raccolta. Completa le <b>Missioni Serra</b> settimanali per guadagnare oro e — 30% di probabilità — un consumabile comune.`,
    },
    {
      icon: '🐾', title: 'Santuario dei Famigli',
      body: `Adotta un famiglio nel Rifugio. Ha Fame, Umore e Energia che scendono col tempo: nutrilo e giocaci ogni giorno. I famigli con statistiche alte ti danno bonus passivi all'XP e all'oro. Se trascurato troppo a lungo si ammala e i bonus si azzerano. Puoi sbloccare famigli rari completando missioni speciali.`,
    },
    {
      icon: '💰', title: 'Sacca del Viandante',
      body: `La sacca (menu Eroe) contiene i tuoi consumabili. Ogni consumabile ha un effetto istantaneo o un buff temporaneo: pozioni che raddoppiano l'XP per 3 sessioni, rune che moltiplicano l'oro, scudi che proteggono la streak, e molto altro. Puoi venderli all'<b>Erborista</b> nel Mercato o usarli prima di un allenamento per massimizzare le ricompense. I consumabili si ottengono da: Arena, boss, mappa, sfide, missioni Serra e acquistandoli dall'Erborista.`,
    },
    {
      icon: '🏘️', title: 'Borgo',
      body: `Il Mercato ha 4 sezioni: <b>Bazar</b> (oggetti equipaggiabili comuni), <b>Mercato Nero</b> (rari con prezzi premium), <b>Fucina</b> (potenzia gli oggetti che hai), <b>Erborista</b> (compra consumabili per rarità: comune 45🪙, raro 130🪙, epico 380🪙). Nel weekend appare anche il <b>Mercante Itinerante</b> con 3 oggetti rari a rotazione.`,
    },
    {
      icon: '🌍', title: 'Mappa del Mondo',
      body: `La Mappa si sblocca man mano che sali di livello. Ogni bioma ha una storia, mostri unici e loot specifico per zona. Percorrendo km reali esplori il mondo virtuale. Alcuni biomi nascondono <b>Lettere</b> da collezionare che raccontano la lore del mondo di RPGym.`,
    },
    {
      icon: '🎴', title: 'Carte e Imprese',
      body: `Ogni traguardo (km totali, allenamenti, vittorie Arena, livelli) sblocca una Carta illustrata nel tuo album. Le Imprese sono obiettivi a lungo termine con ricompense uniche. Le carte sbloccate compongono il tuo profilo eroe, visibile anche agli amici.`,
    },
    {
      icon: '📤', title: 'Sfida un Amico (PvP)',
      body: `Condividi la tua Hero Card con un amico. Chi percorre più km in 7 giorni vince la sfida e porta a casa oro e gloria. Il tuo record PvP è visibile nel profilo e sblocca titoli speciali come Duellante, Gladiatore e Campione.`,
    },
    {
      icon: '🏆', title: 'Prestige (Rinascita)',
      body: `Al livello 100 puoi scegliere di <b>Rinascere</b>: torni al livello 1 ma ottieni un bonus permanente di <b>+20% XP</b> su tutti gli allenamenti futuri. Oggetti, km, trofei e oro rimangono intatti. Ogni Rinascita aumenta il moltiplicatore cumulativamente.`,
    },
    {
      icon: '💡', title: 'Consigli pratici',
      body: `
        <ul class="guida-tips">
          <li>Usa i consumabili <b>prima</b> di registrare l'allenamento — i buff vengono applicati al momento del log.</li>
          <li>Tieni d'occhio le sfide giornaliere: completarle tutte sblocca il bonus totale.</li>
          <li>Il boss settimanale resetta ogni lunedì — non perdere la finestra.</li>
          <li>Visita l'Erborista ogni giorno: a volte ha oggetti rari a prezzo di comune.</li>
          <li>Equipa sempre tutti gli slot — anche un oggetto comune dà +XP.</li>
          <li>Il famiglio va nutrito almeno una volta al giorno per mantenere i bonus.</li>
          <li>Backup regolare del salvataggio dalle Impostazioni — il gioco salva in locale.</li>
        </ul>`,
    },
  ];

  sections.forEach(s => {
    const panel = el('div', 'panel guida-panel');
    const head = el('div', 'guida-head');
    head.innerHTML = `<span class="guida-icon">${s.icon}</span><span class="guida-title">${s.title}</span>`;
    const body = el('div', 'guida-body');
    body.innerHTML = s.body;
    body.style.display = 'none';
    head.addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
      head.classList.toggle('guida-open');
    });
    panel.appendChild(head);
    panel.appendChild(body);
    c.appendChild(panel);
  });
}
