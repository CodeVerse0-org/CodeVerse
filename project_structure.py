from pathlib import Path

IGNORE = {
    "venv",
    ".venv",
    "node_modules",
    ".git",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
    ".idea",
    ".vscode",
    ".mypy_cache"
}

def tree(directory: Path, prefix=""):
    items = [p for p in sorted(directory.iterdir()) if p.name not in IGNORE]

    for index, item in enumerate(items):
        connector = "└── " if index == len(items) - 1 else "├── "
        print(prefix + connector + item.name)

        if item.is_dir():
            extension = "    " if index == len(items) - 1 else "│   "
            tree(item, prefix + extension)

root = Path(".")
with open("project_structure.txt", "w", encoding="utf-8") as f:
    import sys
    old_stdout = sys.stdout
    sys.stdout = f
    print(root.resolve().name)
    tree(root)
    sys.stdout = old_stdout

print("Saved to project_structure.txt")