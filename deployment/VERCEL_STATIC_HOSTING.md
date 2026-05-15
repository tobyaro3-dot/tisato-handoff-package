# Vercel Static Hosting

## Recommended For

Static hosting now, with the option to later add Next.js API routes.

## Steps

1. Create a Vercel account owned by the client.
2. Create a new project from a Git repository or upload.
3. Import this repository.
4. Keep the repository root selected. The included root `vercel.json` points Vercel at `public-site/` as the deployable static output.
5. Leave the framework preset as `Other`, the build command empty, and the output directory as `public-site` if Vercel asks you to confirm settings.
6. Deploy and verify `/`, `/thank-you`, `/admin`, `/robots.txt`, `/sitemap.xml`, and `/assets/css/styles.css`.
7. Configure the custom domain.
8. Add environment variables only when backend functions are introduced.

## Notes

If the client wants booking/admin/email automation, the project should eventually become a full app rather than a static-only deployment.

The public booking form and admin page are static demo pages. They store demo booking records in the visitor's browser storage and do not send live dispatch emails or save requests to a server.

