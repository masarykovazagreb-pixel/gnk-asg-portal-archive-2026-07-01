# Admin menu fix — 25. 6. 2026.

Ovaj zapis prati izolirani popravak administratorskog izbornika.

- spriječen beskonačni MutationObserver ciklus koji je ponovno gradio navigaciju
- navigacijski HTML mijenja se samo kada je sadržaj stvarno različit
- klikovi na lijeve gumbe Operator Dashboarda imaju stabilan delegirani handler
- javni portal, sadržaj, Auto Editor, tržišta i vizual nisu mijenjani
