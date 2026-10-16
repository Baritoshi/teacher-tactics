# Teacher Tactics: Seating Plan

Lekka gra logiczna o przesadzaniu uczniów. React + TypeScript + Vite, CSS i SVG. Bez backendu, silnika gier i bibliotek zarządzania stanem.

[Zagraj na GitHub Pages](https://baritoshi.github.io/teacher-tactics/) · [Repozytorium](https://github.com/Baritoshi/teacher-tactics)

## Uruchomienie

Wymagane Node.js 22.13+ oraz pnpm 11.25.0 (można zainstalować przez `npm install -g pnpm@11.25.0`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz adres wypisany przez Vite (zwykle http://127.0.0.1:5173).

```sh
pnpm test       # testy reguł i przejść stanu
pnpm lint       # ESLint; zero warnings
pnpm exec tsc --noEmit # sam TypeScript
pnpm build      # TypeScript + produkcyjny katalog dist/
pnpm preview    # lokalny podgląd produkcyjny
```

## Zasady MVP

Normal Lesson: 4 × 4, 16 uczniów, sześć typów. Kliknij ucznia, potem drugiego, by zamienić ich miejscami za jeden ruch. Ponowne kliknięcie wybranego ucznia anuluje zaznaczenie bez kosztu. Hint kosztuje jeden ruch i wskazuje najsilniejszą problematyczną parę. Analysis i Legend są bezpłatne. Reset / Try Again losuje nową klasę i zeruje ruchy.

`totalNoise = baseNoise + seatModifiers + pairEffects`. Sąsiedztwo tylko pionowe i poziome, każda para raz. Pierwszy rząd: −2 na ucznia, lewa kolumna: +1. Joker/Joker +4, ToughGuy/ToughGuy +5, Troublemaker/Joker +6, Geek/Geek +3, Nerd/Quiet −2. Modyfikatory narożnego miejsca sumują się.

Wygrana przy hałasie ≤45, porażka przy >60 (dokładnie 60 nadal pozwala grać). Po zakończeniu ruchy i podpowiedzi są zablokowane. Ocena zależy od liczby ruchów, wliczając podpowiedzi. Losowanie odrzuca układy już zakończone, maksymalnie 2000 prób. Influence i morale pozostają informacyjne i nie wpływają na wynik. Stan gry jest w pamięci, bez localStorage na tym etapie.

## Computer Room

W selektorze **Scenario** u góry wybierz jeden z pięciu scenariuszy: Normal Lesson, Computer Room, Substitute Lesson, Lesson Observation lub Half Absent. Zmiana scenariusza tworzy nowy losowy układ i zeruje ruchy, zaznaczenie, dialog oraz wynik. Reset i Try Again zachowują wybrany scenariusz i jego layout.

Computer Room korzysta z tej samej listy 16 uczniów, ale z innej sali: **8 komputerów po 2 miejsca**, ustawionych w U otwarte ku nauczycielowi (2 stanowiska po lewej, 2 po prawej, 4 na dole). Każdy uczeń ma osobny klikalny Seat. Wszyscy siedzą twarzą do monitora: Left / Right / Down. Normal Lesson zachowuje grid 4 × 4 i orientację Up.

Geek otrzymuje +1 hałasu bazowego (2 → 3), Troublemaker +1 (6 → 7), a Geek/Geek jako sąsiedzi daje +5 zamiast +3. Dwa Geeki przy jednym komputerze otrzymują **dodatkowe +2**, zatem jedna para może dawać +7. Target = 48, lose = 62 (porażka przy >62), hintCost = 1. Oceny i pozostałe relacje pozostają standardowe.

Sąsiedztwo jest jawnym grafem layoutu: miejsca idą kolejno po obwodzie U, uwzględniając partnera przy komputerze i sąsiada przy kolejnym stanowisku. Nie ma rozmów przez środek sali ani połączenia między górnymi końcami U. Wartości modyfikatorów miejsc pozostają −2 z przodu i +1 przy oknach: w U oznaczone są cztery miejsca przy dwóch górnych komputerach oraz cztery miejsca przy lewej ścianie. Przy pełnej klasie ich suma nadal wynosi −4.

Balans zmieniaj w `COMPUTER_ROOM` w `src/game/levels.ts`: `baseNoiseModifiers`, `relationships`, `workstationRelationships`, `targetNoise`, `loseNoise`, `hintCost`, `ratings`. Modyfikatory są stosowane przy odczycie, bez zmiany źródłowego rosteru. `NoiseBreakdown` zwraca `baseNoise`, `seatModifiers`, `pairEffects` (wyłącznie sąsiedztwo), `workstationEffects` i `totalNoise` będący ich sumą. Normal Lesson ma `workstationEffects = 0` i nie pokazuje tej pozycji w Analysis.

Każda para w `pairs` ma osobno `neighbourNoise` i `workstationNoise` oraz ich sumę `noise`. Linia SVG jest jedna dla pary: przerywana dla zwykłej relacji, ciągła przy dodatkowym efekcie komputera, z łączną wartością (np. +7) i opisem składników. Ringi i Hint wykorzystują te same dane. Kalkulator usuwa duplikaty i odwrócone krawędzie grafu.

## Dane layoutu i grafika

`LevelDefinition.classroomLayout` wskazuje dane z `src/game/layouts.ts`. `SeatDefinition` zawiera id, procentowe x/y/width/height, orientation, opcjonalny workstationId i flagi modyfikatorów miejsca. `ComputerWorkstation` zawiera id, position, orientation, seatA i seatB. Losowanie korzysta z listy identyfikatorów miejsc, więc nie wymaga ciągłej numeracji ani zapełnienia wszystkich miejsc.

Wspólny `Classroom.tsx` renderuje pozycje i graf z danych. Nie ma osobnego stanu ani kalkulatora dla Computer Room. Późniejsze assety komputerów podmienimy w `src/components/ComputerWorkstation.tsx` i odpowiadających mu stylach w `src/styles/game.css`; współrzędne, miejsca i reguły pozostaną niezależne od grafiki.

## Substitute Lesson i Lesson Observation

Oba levele korzystają ze standardowej sali 4 × 4 i wspólnego rosteru 16 uczniów. Substitute Lesson: target 48, lose >65, hint 1 ruch. Joker, ToughGuy i Troublemaker otrzymują +1 do bazowego hałasu; `positivePairModifier: 1` zwiększa każdą istniejącą dodatnią relację sąsiedzką o 1, raz na parę. Ujemne i zerowe relacje pozostają bez zmian. Analysis, Legend, szczegóły ucznia, linie i Hint korzystają z tych samych efektywnych wartości, bez mutowania globalnych archetypów.

Lesson Observation: target 40, lose >55, hint 2 ruchy. Bazowy hałas i relacje pozostają standardowe. Oceny za ruchy: 0–3 Masterclass, 4–6 Excellent, 7–9 Good, 10–12 Acceptable, 13–16 Barely survived, 17+ Total teacher exhaustion.

Balans wszystkich scenariuszy edytuj w `src/game/levels.ts`: `targetNoise`, `loseNoise`, `hintCost` (koszt w ruchach), `ratings` (progi ocen z górną granicą włącznie), `baseNoiseModifiers`, `positivePairModifier` oraz reguły relacji. `getRating` odczytuje `level.ratings`; EndScreen nie definiuje progów. Normal Lesson, Computer Room i Substitute Lesson zachowują standardowe granice 4/8/12/16/22/Infinity.

Nowy scenariusz oparty na istniejących mechanikach wymaga własnego LevelDefinition i wpisu w LEVELS. Selektor automatycznie pokazuje nazwę i numer 01 / 05 … 05 / 05, a przełączenie montuje nową grę z wybraną konfiguracją. Nie trzeba kopiować komponentów ani logiki. Nowe rodzaje mechaniki mogą wymagać rozszerzenia wspólnego modelu i testów.

## Half Absent i relacje przestrzenne

Half Absent ma 16 miejsc i 8 uczniów losowanych bez powtórzeń z całego rosteru. Reset losuje nowy skład i nowe pozycje. Startowe progi: target 22, lose >38, hint 1 ruch; oceny: 0–2 / 3–4 / 5–6 / 7–8 / 9–11 / 12+. Wszystkie wartości, w tym `studentCount: 8` i `distantInteractionMultiplier: 0.5`, są w `HALF_ABSENT` w `src/game/levels.ts`.

Losowanie, tak jak dotychczas, odrzuca plansze już wygrane lub przegrane (maksymalnie 2000 prób). Przy ograniczonym `studentCount` ponownie losuje również skład, więc rozkład zaakceptowanych składów jest warunkowany aktywnym wynikiem początkowym. Progi są startowym balansem: generator nie dowodzi rozwiązywalności każdego składu. Bardzo głośne składy mogą wymagać przyszłego dopracowania balansu; proceduralny solver nie jest częścią MVP.

`src/game/spatial.ts` wykrywa topologię niezależnie od wartości hałasu:

- `Adjacent`: jawne krawędzie `classroomLayout.neighbourPairs`.
- `GapOne`: współrzędne `SeatDefinition.gridPosition` (row/column), ten sam rząd/kolumna, dystans 2, istniejące puste miejsce pośrodku. Brak diagonalnych relacji, zawijania rzędów, rozmów przez zajęte miejsce i luk o długości 2+. Wizualne procenty x/y ani numeracja miejsc nie wpływają na wykrywanie. Layout bez logicznej siatki nie otrzymuje GapOne automatycznie.
- `SameWorkstation`: para `seatA` / `seatB` we wspólnym stanowisku.

Pary są normalizowane i deduplikowane w każdej kategorii; Adjacent wyklucza GapOne dla tej samej pary. Adjacent i SameWorkstation mogą świadomie współistnieć. Nowy rodzaj topologii należy dodać jako detektor w module spatial oraz obsłużyć jego regułę w kalkulatorze; komponenty nie wykrywają relacji.

`NoiseCalculator` nakłada reguły levelu na wykryte relacje i zwraca `effects: RelationshipEffect[]` z `studentAId`, `studentBId`, `relationType`, `noiseDelta`, `source` oraz opcjonalnym `viaSeatId`. GapOne działa tylko przy dodatniej końcowej wartości relacji i w levelu z mnożnikiem. Kolejność: reguła pary → `positivePairModifier` → mnożnik → `Math.round()`. Dla 0.5: Joker/Joker 2, ToughGuy/ToughGuy 3, Troublemaker/Joker 3, Geek/Geek 2; Nerd/Quiet nie działa na dystans.

`totalNoise = baseNoise + seatModifiers + adjacentPairEffects + distantPairEffects + workstationEffects`.

`pairEffects` pozostaje kompatybilnym aliasem `adjacentPairEffects`, a `pairs` to agregat tych samych efektów na potrzeby renderowania i hintów. UI nie oblicza relacji ponownie. Analysis pokazuje distant/workstation tylko dla leveli z odpowiednią regułą. GapOne ma cieńszą przerywaną linię i etykietę HTML o stałym rozmiarze, aby tekst nie był spłaszczany przez SVG na szerokiej sali. Pozostałe linie i ringi zachowują dotychczasowy styl.

Kliknięcie ucznia i pustego miejsca zmienia jego seatId za jeden ruch; stara ławka pozostaje pusta, a liczba uczniów się nie zmienia. Kliknięcie pustej ławki bez zaznaczenia nic nie robi. Zaznaczenie ucznia podświetla dostępne puste cele; ruch lub anulowanie usuwa podświetlenia. Po ruchu przeliczany jest cały wynik i status. Hint wybiera najsilniejszy aktualny problem; dla GapOne opisuje rozmowę przez pustą ławkę i sugeruje przesunięcie lub zablokowanie luki. Nie wykonuje ruchu automatycznie ani nie obiecuje, że każdy taki ruch obniży cały hałas.

## Odtwarzanie układów i informacje developerskie

```ts
createGame(HALF_ABSENT, 42); // ten sam seed = ten sam skład, miejsca i wynik
createGame(HALF_ABSENT);     // zwykłe Math.random()
```

`src/game/random.ts` zawiera Mulberry32 i Fisher–Yates, bez dodatkowych zależności. Seed jest bezpieczną liczbą całkowitą normalizowaną do uint32; różne wartości modulo 2^32 oznaczają różne sekwencje, ale nie stanowią gwarancji unikalnej planszy.

W lokalnym Vite otwórz `/?debug=1&seed=42`, a następnie wybierz scenariusz. Panel Development pokazuje aktywny level, seed, zajęte/puste seat IDs, breakdown i efekty relacji. Reset / Try Again zwiększa seed o 1 (modulo 2^32), żeby dać nowy odtwarzalny układ. Przełączenie scenariusza korzysta z seeda w URL. Bez parametru seed reset jest losowy. Panel i odczyt parametrów są dostępne wyłącznie przy `import.meta.env.DEV`; produkcja ignoruje debug/seed w adresie.

Testy `halfAbsent.test.tsx` obejmują sampling, empty seats, ruchy, wartości i geometrię GapOne, blokady, brak double counting, breakdown, hinty, renderowanie, progi ocen i RNG. Pętle invariantów wykonują ruchy dla 60 seedów każdego levelu: unikalni uczniowie/miejsca, zachowana liczebność, różne końce par, skończony wynik i dokładne sumy. Istniejące testy czterech leveli nadal obowiązują. Projekt nie ma osobnego skryptu lint.

## Struktura plików

```text
.github/workflows/deploy.yml  # test, build, GitHub Pages
src/
  components/
    Classroom.tsx            # sala i linie SVG
    ComputerWorkstation.tsx  # placeholder biurka, monitora i klawiatury
    Seat.tsx                 # klikane miejsce
    Student.tsx              # znacznik ucznia
    LevelSelect.tsx          # selektor i numeracja z LEVELS
    HUD.tsx                  # wynik i przyciski
    DialogPanel.tsx           # informacje, hint, analiza, legenda
    DevInfo.tsx              # panel i seed tylko w development
    EndScreen.tsx            # wygrana / porażka
  game/
    types.ts                 # Student, LevelDefinition, GameState
    archetypes.ts            # rejestr statystyk, kolorów, opisów i reguł
    behaviours.ts           # czyste reguły self effects
    hints.ts                # wybór problemu z efektów kalkulatora
    students.ts              # instancje i roster
    relationships.ts         # symetryczne reguły par
    spatial.ts               # Adjacent, GapOne, SameWorkstation
    random.ts                # seeded RNG i shuffle
    halfAbsent.test.tsx      # puste miejsca, spatial, seedy i invarianty
    noiseCalculator.ts       # czysta funkcja i breakdown
    levels.ts                # progi, hintCost, modyfikatory i oceny
    layouts.ts               # grid, U, miejsca, orientacje i graf sąsiedztwa
    gameUtils.ts             # losowanie, zamiana, status, hint
    game.test.ts             # testy logiki
    computerRoom.test.tsx     # reguły i wspólna prezentacja scenariuszy
    scenarios.test.tsx       # Substitute, Observation, oceny i konfiguracja UI
    layouts.test.tsx          # geometria, workstation effects, swap i puste miejsca
  styles/game.css
  App.tsx                    # połączenie komponentów i React state
  main.tsx
```

## Deployment na GitHub Pages

1. Wyślij repozytorium do GitHuba (główna gałąź: `main`).
2. W repozytorium wybierz **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push na `main` uruchamia `.github/workflows/deploy.yml`. Można też wybrać **Actions → Deploy to GitHub Pages → Run workflow**.
4. Workflow instaluje zależności według lockfile, uruchamia testy, lint i build, a następnie publikuje `dist/`. Adres witryny jest w podsumowaniu wdrożenia.

Vite używa `base: './'`, więc zasoby działają również pod ścieżką `/teacher-tactics/`. Osobny skrypt deploy nie jest potrzebny. Fonty Google są opcjonalne; bez sieci używane są fonty systemowe.

## Rozszerzanie

`LevelDefinition` obejmuje classroomLayout, roster, reguły relacji sąsiedzkich i stanowiskowych, opcjonalne modyfikatory hałasu bazowego, opis, progi hałasu, koszt podpowiedzi i ocenianie. Nowy kształt sali można zdefiniować przez dane miejsc, stanowisk i grafu bez zmiany `Classroom.tsx`. Zamiana obsługuje już puste miejsca, ale pierwsze cztery scenariusze używają pełnej klasy, a Half Absent ma 8 uczniów na 16 miejscach. Nowe kategorie zachowań wymagają rozszerzenia czystego ewaluatora i testów; istniejące kategorie można łączyć konfiguracją.

Możliwe kolejne kierunki: testy balansu losowanych składów, dopracowanie grafiki i dostępności oraz kolejne reguły przestrzenne oparte na obecnym modelu.


## Archetypy i Behaviour Lab

`src/game/archetypes.ts` jest rejestrem `StudentArchetypeDefinition`: id, displayName, shortCode, description, baseNoise, color, influence, traits, behaviourRules. Zachowuje wartości, kolory i opisy sześciu starych archetypów. `StudentInstance` zawiera id, name, archetypeId, seatId oraz opcjonalne relationshipTags/morale. Instancja nie kopiuje statystyk ani reguł. Kalkulator odczytuje definicję i dopiero nakłada modyfikatory levelu. Opcjonalne `LevelDefinition.archetypes` pozwala podać własny rejestr; klucze muszą odpowiadać `definition.id`.

`behaviours.ts` interpretuje dwa rodzaje danych: `seat-condition` (front-row, back-row, middle-row, window) i `adjacent-count` (min/max zajętych sąsiadów). Używa tych samych wykrytych relacji przestrzennych co pary. GapOne nie zwiększa licznika sąsiadów. Reguły mogą wnosić `contribution.noise` i/lub `contribution.engagement`. Nie ma gałęzi po nazwach archetypów. Nowa kombinacja tych warunków wymaga tylko definicji, nowe rodzaje warunków wymagają rozszerzenia ewaluatora.

- Phone Addict: base 2, przód −1, tył +3, okno +1; efekty sumują się.
- Good Only Alone: base 1, bez zajętych sąsiadów −2, z co najmniej jednym +2 raz.
- Gossip: base 2; sam archetyp nie tworzy relacji między dowolnymi osobami.
- Sleeper: base 0, engagement −3 z przodu, −1 w środku, 0 z tyłu. Nie dodaje hałasu sam z siebie; standardowe modyfikatory miejsca nadal obowiązują.

`StudentEffect` zapisuje studentId, ruleId, effectType, noiseDelta, engagementDelta, source, description i opcjonalny hint. Źródłem jest seat-position albo alone-condition. Reguła o tym samym ID jest liczona raz na ucznia. Definicje nie są mutowane.

`LevelDefinition.specificRelationships` wiąże dwa ID uczniów, nie imiona ani archetypy. W Lab Marta i Kasia mają Gossip Partner: Adjacent +8, GapOne +4. Wartości są jawne i nie przechodzą ponownie przez mnożnik zwykłych par. Odwrócone/zdublowane wpisy tego samego typu i tej samej pary są deduplikowane. Różne typy relacji mogą świadomie współistnieć. Efekt zachowuje `relationType` oraz `source: specific-relationship`, dzięki czemu linia GapOne, inspect i hint używają jednej kalkulacji.

Pełny wynik: `baseNoise + seatModifiers + archetypeSeatEffects + adjacentPairEffects + distantPairEffects + specificRelationshipEffects + workstationEffects`. Alias `pairEffects` oznacza wyłącznie adjacent. Nie należy sumować aliasu dodatkowo. `studentContributions` przypisuje połowę każdego współdzielonego efektu obu uczniom; suma ich totalNoise równa się wynikowi klasy. Lista relacji w inspectorze pokazuje pełną wartość pary i wyjaśnia podział.

`EngagementBreakdown` ma base=0, archetypeEffects i total. Analysis pokazuje go tylko wtedy, gdy obecni uczniowie mają reguły engagement. Nie zmienia statusu, ocen ani priorytetu hinta. Hint porównuje największy dodatni sumaryczny self effect z największym problemem pary. Teksty reguł korzystają z placeholderów `{name}`, `{partner}`, `{noise}`; nie trzeba dopisywać nowego archetypu do hinta.

Legend i tokeny generują się z rejestru. Panel ucznia pokazuje bazę, standardowe modyfikatory miejsca, osobiste efekty, relacje, specjalnego partnera oraz całkowity wkład. Dłuższe notatki przewijają się wewnątrz panelu, także klawiaturą; zmiana trybu rozpoczyna panel od góry.

Behaviour Lab znajduje się w osobnej grupie **Experimental** selektora, także w buildzie produkcyjnym. Pięć zwykłych lekcji zachowuje numerację 01/05–05/05 i stare składy. Lab: 12 uczniów, 16 miejsc, target 24, lose >48, hint 1; balans służy testowaniu. `src/game/students.ts` określa skład (pięć nowych osób i siedem dotychczasowych), a `src/game/levels.ts` progi oraz konkretną relację. Half Absent może opcjonalnie ustawić `rosterPool`, z którego losuje studentCount osób; domyślny roster i losowanie nie zmieniły się.

`archetypes.test.tsx` sprawdza wszystkie cztery zachowania, brak mutacji/podwójnego liczenia, relacje po ID mimo zmiany imion, wpływ engagement tylko na breakdown, priorytety hintów, automatyczne renderowanie nowej definicji, inspect, linie, opcjonalny pool, seed/reset Lab oraz sumy wszystkich kategorii i wkładów podczas ruchów. Dotychczasowe testy pięciu lekcji zachowują oczekiwane wyniki; ich fixtures używają teraz archetypeId zamiast skopiowanej bazy. ESLint działa lokalnie i w GitHub Actions.
