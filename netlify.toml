[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

# Every path below is already wired on the front end (script.js).
# They run in demo mode out of the box, and upgrade to real behaviour
# automatically the moment the matching environment variables are set
# in Netlify's dashboard. See README.md for the plain-language steps.

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
