# GitHub Repository Setup Guide

Since the GitHub CLI (`gh`) is not installed or authenticated on this environment, you need to manually create the repository on GitHub and push the code.

## Steps

1.  **Log in to GitHub**: Go to [https://github.com](https://github.com) and log in with your account:
    -   **User**: `Bellitian-lgtm`
    -   **Email**: `bellitian@gmail.com`

2.  **Create a New Repository**:
    -   Click the **+** icon in the top right corner and select **New repository**.
    -   **Repository name**: `cortinas-y-estilo` (or any name you prefer).
    -   **Public/Private**: Choose your preference (Private is recommended for projects with business logic).
    -   **Initialize this repository with**: **DO NOT** check any boxes (Readme, .gitignore, License). We already have these.
    -   Click **Create repository**.

3.  **Push your Local Code**:
    -   Run these commands in your terminal:
        ```bash
        git push -u origin master
        ```
    -   (The remote `origin` has already been configured for you).

## Note on Credentials

When you run `git push`, GitHub might ask for your password. If you have **Two-Factor Authentication (2FA)** enabled, you must use a **Personal Access Token (PAT)** instead of your password.
