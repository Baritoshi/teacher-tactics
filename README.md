# Teacher Tactics: Seating Plan

Lekka gra logiczna o przesadzaniu uczniów. React + TypeScript + Vite, CSS i SVG. Bez backendu, silnika gier i bibliotek zarządzania stanem.

[Zagraj na GitHub Pages](https://baritoshi.github.io/teacher-tactics/) · [Repozytorium](https://github.com/Baritoshi/teacher-tactics)

## Uruchomienie

Wymagane Node.js 22.12+ oraz pnpm 11.25.0 (można zainstalować przez `npm install -g pnpm@11.25.0`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz adres wypisany przez Vite (zwykle http://127.0.0.1:5173).

```sh
pnpm test       # testy reguł i przejść stanu
pnpm build      # TypeScript + produkcyjny katalog dist/
pnpm preview    # lokalny podgląd produkcyjny
```

## Zasady MVP

Normal Lesson: 4 × 4, 16 uczniów, sześć typów. Kliknij ucznia, potem drugiego, by zamienić ich miejscami za jeden ruch. Ponowne kliknięcie wybranego ucznia anuluje zaznaczenie bez kosztu. Hint kosztuje jeden ruch i wskazuje najsilniejszą problematyczną parę. Analysis i Legend są bezpłatne. Reset / Try Again losuje nową klasę i zeruje ruchy.

`totalNoise = baseNoise + seatModifiers + pairEffects`. Sąsiedztwo tylko pionowe i poziome, każda para raz. Pierwszy rząd: −2 na ucznia, lewa kolumna: +1. Joker/Joker +4, ToughGuy/ToughGuy +5, Troublemaker/Joker +6, Geek/Geek +3, Nerd/Quiet −2. Modyfikatory narożnego miejsca sumują się.

Wygrana przy hałasie ≤45, porażka przy >60 (dokładnie 60 nadal pozwala grać). Po zakończeniu ruchy i podpowiedzi są zablokowane. Ocena zależy od liczby ruchów, wliczając podpowiedzi. Losowanie odrzuca układy już zakończone, maksymalnie 2000 prób. Influence i morale są wyświetlane, ale celowo nie wpływają jeszcze na wynik. Stan gry jest w pamięci, bez localStorage na tym etapie.

## Struktura

```text
.github/workflows/deploy.yml  # test, build, GitHub Pages
src/
  components/
    Classroom.tsx            # sala i linie SVG
    Seat.tsx                 # klikane miejsce
    Student.tsx              # znacznik ucznia
    HUD.tsx                  # wynik i przyciski
    DialogPanel.tsx           # informacje, hint, analiza, legenda
    EndScreen.tsx            # wygrana / porażka
  game/
    types.ts                 # Student, LevelDefinition, GameState
    students.ts              # typy, kolory i roster
    relationships.ts         # symetryczne reguły par
    noiseCalculator.ts       # czysta funkcja i breakdown
    levels.ts                # progi, hintCost, modyfikatory i oceny
    gameUtils.ts             # losowanie, zamiana, status, hint
    game.test.ts             # testy logiki
  styles/game.css
  App.tsx                    # połączenie komponentów i React state
  main.tsx
```

## Deployment na GitHub Pages

1. Wyślij repozytorium do GitHuba (główna gałąź: `main`).
2. W repozytorium wybierz **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push na `main` uruchamia `.github/workflows/deploy.yml`. Można też wybrać **Actions → Deploy to GitHub Pages → Run workflow**.
4. Workflow instaluje zależności według lockfile, uruchamia testy i build, a następnie publikuje `dist/`. Adres witryny jest w podsumowaniu wdrożenia.

Vite używa `base: './'`, więc zasoby działają również pod ścieżką `/teacher-tactics/`. Osobny skrypt deploy nie jest potrzebny. Fonty Google są opcjonalne; bez sieci używane są fonty systemowe.

## Rozszerzanie

`LevelDefinition` obejmuje rozmiar siatki, roster, reguły relacji, modyfikatory, progi hałasu, koszt podpowiedzi i ocenianie. Można zmienić te dane bez przepisywania kalkulatora. Zamiana obsługuje już puste miejsca, ale MVP udostępnia tylko pełną klasę Normal Lesson. Nowe mechaniki, np. rozmowa przez puste miejsce, wymagają osobnego rozszerzenia zasad i testów.

Następne kroki: (1) zapis najlepszych wyników w localStorage, (2) testy balansu i dopracowanie oprawy, (3) Half Absent z pustymi miejscami, dopiero po ustabilizowaniu Normal Lesson.
