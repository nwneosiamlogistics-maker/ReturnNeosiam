
import os

file_path = "d:/returnneosiam-pro (18)/components/NCRSystem.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# We want to delete lines 228 to 396 (1-based index)
# In 0-based index: 227 to 396 (inclusive of 227, exclusive of 396? No, 396 is the closing brace)
# Line 228 content: "    const ncrNos = generatedNCRNumber || "Preview-Draft";\n"
# Line 396 content: "};\n"

start_line_1_based = 228
end_line_1_based = 396

start_index = start_line_1_based - 1
end_index = end_line_1_based # We want to exclude up to this index (slice upper bound)

# Check content to be safe
print(f"Deleting lines {start_line_1_based} to {end_line_1_based}")
print(f"Start content: {lines[start_index]}")
print(f"End content: {lines[end_index - 1]}")

new_lines = lines[:start_index] + lines[end_index:]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("File updated successfully.")
