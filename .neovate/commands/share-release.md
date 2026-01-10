---
name: Share Release
description: Generate release share note for latest release with Chinese translation
---

Generate a release share note for the latest release of neovate-code:

1. Fetch the latest release from https://github.com/neovateai/neovate-code/releases
2. Extract the Highlights section
3. Translate the Highlights to Chinese directly without adding your own interpretation or additional changes
4. Format the output like this:

```
+ @neovate/code@<version>

## Highlights

<translated highlights in Chinese>

详见 https://github.com/neovateai/neovate-code/releases/tag/<version>
```

5. Copy the final output to clipboard using `pbcopy`
