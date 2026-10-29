import re

with open("assets/js/app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's locate initPreferences
start_idx = content.find("// ===== PREFERENCES MODAL")
end_idx = content.find("toggleTaskbarSubmenu", start_idx)

print("Found region from", start_idx, "to", end_idx)
print("Preview of start:")
print(content[start_idx:start_idx+300])

