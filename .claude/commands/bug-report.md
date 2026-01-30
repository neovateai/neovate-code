---
description: Create a bug report issue on GitHub
---

Create a GitHub bug report issue for this project. Follow this process:

1. Ask the user to describe the bug in their own words
2. Ask for steps to reproduce the bug
3. Ask if they have any logs to include (this is optional)
4. Use AskUserQuestion tool to select severity with these options:
   - annoyance
   - serious, but I can work around it
   - blocking all usage of @neovate/code
5. Format the information into a structured bug report with sections:
   - Describe the bug
   - Reproduction
   - Logs (if provided)
   - Severity
6. Show the formatted issue to the user and ask for confirmation
7. Create the issue using: gh issue create --title "[Bug]: <brief_summary>" --body "<formatted_body>"

If gh CLI is not available or not authenticated, inform the user how to set it up.
