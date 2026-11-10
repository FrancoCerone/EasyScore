# Formato spartito EasyScore

File esportato da EasyScore Configurator (pulsante **Esporta**). Estensione tipica: `nome.easyscore.json`.

EasyScore lo usa per disegnare lo spartito, per evidenziare il beat corrente e per mostrare gli appunti di testo. Il file contiene le pagine, i righi, quanti beat evidenziare insieme, i riquadri di testo e, facoltativi, il BPM e il conteggio iniziale. Non contiene video.

## Come riconoscerlo

Il documento è JSON UTF-8. Va accettato solo se:

- `kind` è esattamente `"tab-sala"`
- `pages` è un array con almeno una pagina
- ogni pagina ha `image` (Base64) e `lines` (array, anche vuoto)

`version` oggi vale `1`. Un valore diverso non va rifiutato: i campi sotto restano quelli da leggere.

## Struttura

```json
{
  "kind": "tab-sala",
  "version": 1,
  "bpm": 96,
  "precount": 4,
  "pages": [
    {
      "name": "strofa.png",
      "type": "image/png",
      "image": "<Base64 dell'immagine, senza prefisso data:>",
      "lines": [
        { "x": 0.04, "y": 0.11, "w": 0.92, "h": 0.07, "beats": 8, "highlight": 4 }
      ],
      "notes": [
        { "x": 0.06, "y": 0.02, "w": 0.22, "h": 0.05, "text": "Intro chitarra" }
      ]
    }
  ]
}
```

| Campo | Significato |
| --- | --- |
| `bpm` | Facoltativo. Velocità del metronomo in battiti al minuto. EasyScore lo arrotonda all'intero e lo limita fra 30 e 300; se manca, non è un numero o è ≤ 0 usa 120. |
| `precount` | Facoltativo. Click del metronomo da contare dopo Play prima che parta l'evidenziazione (beat 1). Intero da 0 a 32; se manca o non è valido vale 0. |
| `pages` | Ordine delle pagine, dalla prima all’ultima. I beat proseguono da una pagina alla successiva. |
| `name` | Nome file originale. Solo etichetta. |
| `type` | MIME dell’immagine, per esempio `image/png` o `image/jpeg`. Se manca o non inizia con `image/`, usare `image/png`. |
| `image` | Byte dell’immagine in Base64 standard. Non è un data URL: niente `data:image/png;base64,`. |
| `lines` | Righi di quella pagina, già in ordine di lettura: dall’alto in basso, a parità di altezza da sinistra a destra. Non riordinarli. |
| `x`, `y` | Angolo in alto a sinistra del rigo, in frazione della pagina. `0` è il bordo sinistro o superiore, `1` il bordo destro o inferiore. |
| `w`, `h` | Larghezza e altezza del rigo, nelle stesse frazioni. |
| `beats` | Quanti beat stanno in quel rigo, da 1 a 128. Se manca o non è un numero, vale 8. |
| `highlight` | Quanti beat tenere evidenziati insieme, da 1 a `beats`. Se manca, vale `beats` (tutto il rigo). |
| `notes` | Facoltativo. Riquadri di testo sulla pagina. Se manca, la pagina non ha appunti. Non contano come beat e non vanno riordinati rispetto ai righi. |
| `text` | Testo dell’appunto, al massimo 400 caratteri. Un appunto vuoto o senza testo si scarta. |

`x`, `y`, `w` e `h` sono relativi all’immagine intera, non ai pixel. Per disegnare: `pixelX = x * larghezzaImmagine`, e lo stesso per `y`, `w` e `h`.

Un rigo più stretto di `0.02` o più basso di `0.015` va scartato. Il rettangolo va tenuto dentro la pagina: se sborda, tagliare `x`/`y` in modo che `x + w` e `y + h` non superino `1`.

Un appunto usa le stesse frazioni `x`, `y`, `w`, `h`. Vale lo stesso scarto sotto `0.02` × `0.015` e lo stesso taglio dentro la pagina. Si disegna sopra l’immagine, con il testo dentro il rettangolo, e non intercetta i click: se copre un rigo, il tocco arriva comunque al rigo. L’evidenziazione del beat resta sopra l’appunto.

## Numerazione dei beat

I beat sono globali e partono da **1**.

Si scorrono le pagine nell’ordine dell’array, e dentro ogni pagina i righi nell’ordine dell’array. Il primo rigo occupa i beat `1 … beats`. Il rigo successivo parte dal beat successivo, anche se è su un’altra pagina.

Esempio: due righi da 8 beat e un rigo da 4.

| Pagina | Rigo | Beat |
| --- | --- | --- |
| 1 | 1 | 1–8 |
| 1 | 2 | 9–16 |
| 2 | 1 | 17–20 |

Il beat `B` appartiene al rigo il cui intervallo contiene `B`. Se non appartiene a nessun rigo, l’evidenziazione va tolta.

Dentro il rigo i beat sono fette orizzontali uguali, da sinistra a destra. La posizione locale, da 0, è:

```text
indice = B - primoBeatDelRigo
```

La fetta `indice` va da `indice / beats` a `(indice + 1) / beats` della larghezza del rigo.

## Evidenziazione

Due pezzi, entrambi alti come il rigo e ancorati al suo rettangolo.

1. **Fascia** (`highlight`): il gruppo di beat che contiene il beat corrente.
2. **Cursore**: una riga verticale sul bordo sinistro del beat corrente.

Il gruppo è allineato all’inizio del rigo, non al beat corrente. Con `highlight = 4` e `beats = 8` i gruppi sono `0–3` e `4–7`. Con `highlight = 1` la fascia copre solo il beat corrente. L’ultimo gruppo può essere più corto se `beats` non è multiplo di `highlight`.

```text
count   = beats del rigo          (fra 1 e 128)
group   = highlight               (fra 1 e count)
indice  = beatGlobale - primoBeatDelRigo
origine = floor(indice / group) * group
larghezzaGruppo = min(group, count - origine)
fetta   = 1 / count

fascia.x = xRigo + origine * fetta * wRigo
fascia.y = yRigo
fascia.w = larghezzaGruppo * fetta * wRigo
fascia.h = hRigo

cursore.x = xRigo + indice * fetta * wRigo
cursore.y = yRigo
cursore.h = hRigo
```

Colori usati dal configuratore, da replicare se si vuole lo stesso aspetto:

- fascia: `rgba(245, 208, 0, 0.22)`, con un bordo sinistro di 3 px `#f5d000`
- cursore: 3 px di spessore, `#f5d000`, centrato sul bordo sinistro della fetta (`margin-left: -1px` su una barra da 3 px)

La fascia e il cursore stanno sopra l’immagine e non intercettano i click. Quando il beat cambia rigo, si tolgono dal rigo precedente e si disegnano su quello nuovo.

Far scorrere la vista in modo che il rigo attivo resti visibile. Nel configuratore, se il bordo superiore del rigo è a meno di 8 px dal bordo della vista, oppure scende sotto il 55% dell’altezza visibile, la pagina scorre fino a lasciare il rigo a circa 16 px dal bordo superiore.

## Esempio

Rigo con `beats = 8`, `highlight = 4`, `x = 0.10`, `w = 0.80`. Arriva il beat locale 5 (indice `4`, cioè il quinto beat del rigo).

- Ogni fetta è `0.80 / 8 = 0.10` della pagina.
- Il gruppo parte all’indice 4 e copre 4 beat: fascia da `0.10 + 0.40 = 0.50` larga `0.40`.
- Il cursore è a `0.10 + 4 * 0.10 = 0.50`.

Il beat locale 6 (indice 5) resta nella stessa fascia; il cursore si sposta a `0.60`.

## Decodifica dell’immagine

```text
byte = Base64Decode(page.image)
mostra l'immagine con MIME page.type
```

Il Base64 può contenere gli a capo: vanno ignorati prima della decodifica. Se la decodifica fallisce, la pagina è inutilizzabile e il file va rifiutato.
