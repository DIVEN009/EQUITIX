# Git Workflow Rules

## Explicit User Confirmation Required
- **MANDATORY**: ALWAYS ask the user for explicit confirmation before running ANY of the following Git commands:
  - `git add` (staging files)
  - `git commit` (creating commits)
  - `git push` (pushing to remote)
  - `git merge`, `git rebase`, `git reset`, `git checkout`
- Never stage, commit, or push changes automatically or proactively without prior approval from the user.
- Always present the summary of changes and proposed commit message / branch targets to the user first, and wait for their explicit permission before running the commands.
