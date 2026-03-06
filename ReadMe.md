## Configure Git Hooks
Make them executable

chmod +x .githooks/pre-commit
chmod +x .githooks/pre-push

Tell Git to use this folder

git config core.hooksPath .githooks