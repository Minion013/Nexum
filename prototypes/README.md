# Throwaway supporting-materials prototype

Question: which visual story best makes a custom, rules-first escrow agreement understandable to a hackathon judge?

Run from the repository root:

```powershell
python -m http.server 8080 --directory prototypes
```

Open `http://localhost:8080/escrow-supporting-materials-prototype.html?variant=A`.

Variants:

- `A`: Deal cockpit - detailed, active-agreement workspace.
- `B`: Rules workspace - explains objective conditions and rule outcomes.
- `C`: Trust flow - explains the payment sequence and exception paths for a pitch.

Use the fixed bottom switcher or the left/right arrow keys to move between variants.
