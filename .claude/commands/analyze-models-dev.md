---
name: Analyze models.dev
description: Fetch and analyze models from models.dev API for adding new models
---

Analyze models from models.dev for the given query: $ARGUMENTS

Steps:

1. **Fetch latest data**: Run `wget -O api.json https://models.dev/api.json` to get the latest API data
2. **Format the file**: Run `python3 -c "import json; data=json.load(open('api.json')); json.dump(data, open('api.json','w'), indent=2, ensure_ascii=False)"`
3. **Search for the model**: Use grep to search for the query in `api.json`
4. **Report findings**: Summarize all matching entries including:
   - Provider name
   - Model ID
   - Model name
   - Model family
   - Key capabilities (attachment, thinking, etc.)
   - Token limits (input/output) if available
