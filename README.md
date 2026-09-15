# Darwin Search Results Viewer

A Single File Component for [Vue.JS (v3)](https://vuejs.org/) for displaying search results from Darwin Search API.

## Installation

1. Clone this repository
2. Run `npm install` at the root level of this repository

## Testing the Search Results

Set the `apiURL` in `./public/searchResults.config.json` to the desired non-protected search API.

If testing on locally indexed data, run [darwin-solr](https://github.com/cambridge-collection/darwin-solr) and [darwin-search](https://github.com/cambridge-collection/darwin-search) in docker on your local machine and set `apiURL` to `http://localhost`.

If testing against the live data, set `apiURL` to `https://search.darwinproject.ac.uk/`.

To run the component locally:

1. Install all dependencies using `npm install`
2. Run `npm run dev`
3. Go to <https://localhost:5173/search>. This will return the first page of all items.
4. Enter something into the search field and click search.

## Building for Deployment

The deployment is currently manual.

1. Set `apiURL` to the appropriate search api for the environment.
2. Run `npm run build` at the root level of this repository
3. The outputs are written to `./dist`.
4. Upload the outputs into the `./www` directory of the environment's release bucket.

At present, the `dist` bucket should only contain:
- `search.html`
- `assets` directory containing:
  - A javascript file called `SearchResults` with a content hash added as a suffix (_e.g._ `SearchResults-DFF7ZWpT.js`)
  - a subdirectory called `cdcp-searchResults` containing two css files (`SearchResults-<hash>.css` & `app-<hash>.css`) and one javascript file (`search-<hash>.js`)

Every asset filename carries a content hash, so the names change whenever the
corresponding source changes. Only `search.html` has a stable name. Upload each
release alongside the previous one rather than replacing its contents, since a
visitor who already has the page open will still request the files named by the
release they loaded.

**Do not deploy any of the outputs** if the build contains any other files or directories as this repository contains a partial selection of common assets included on the main site to make local testing easier. These resources *should* be automatically removed during the build process. They are not necessary because they are added to the bucket as part of the normal data build and release process for the TEI and Site HTML materials. 

Should this directory contain additional assets, rebuilding should solve the problem.

You may occasionally get an error that certain of these superfluous directories/resources can't be deleted towards the end of the build. This appears to be a transitory build error and is resolved simply by building the materials again.

## Notes on implementation

The code is contained within `./src`. The Single Page Application has one route (`/search`) that is dealt with by `./src/views/SearchResults.vue`. `SearchResults.vue` incorporates a number of smaller components, contained in `./src/components/` to create the view.
