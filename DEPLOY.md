# Deployment Guide for Vercel

This guide explains how to deploy the **Cortinas & Estilo Colombia** application to Vercel.

## Prerequisites

- A [Vercel Account](https://vercel.com/signup)
- The project code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Your Gemini API Key

## Deployment Steps

1.  **Push to Git**: Ensure your latest code is committed and pushed to your Git provider.
2.  **Import Project in Vercel**:
    - Go to your Vercel Dashboard.
    - Click **"Add New..."** -> **"Project"**.
    - Import the repository you just pushed.
3.  **Configure Project**:
    - Vercel should automatically detect that this is a **Vite** project.
    - The **Framework Preset** should be `Vite`.
    - The **Root Directory** should be `./` (default).
4.  **Set Environment Variables**:
    - **IMPORTANT**: You must add your Gemini API Key here for the application to work.
    - Expand the **"Environment Variables"** section.
    - Key: `GEMINI_API_KEY`
    - Value: `Your_Actual_Gemini_API_Key_Here` (starts with `AIza...`)
    - Click **"Add"**.
5.  **Deploy**:
    - Click **"Deploy"**.
    - Vercel will build your application and deploy the serverless functions.

## Verification

- Once deployed, open the provided URL.
- Test the chat feature (click the chat icon).
- Ask a question like "Hola" to verify the AI responds without errors.
