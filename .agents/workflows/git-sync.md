---
description: Automated Git Sync (Add, Commit, and Push)
---

This workflow will automatically stage all your changes, create a commit with a timestamped message, and push them to your current branch.

1. Stage all changes
// turbo
`git add .`

2. Commit changes with a default message
// turbo
`git commit -m "Automated update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"`

3. Push to the current branch
// turbo
`git push`
