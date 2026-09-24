# Astro Playground

An Astro site rendering Contensis content, used to prove patterns for building Contensis-backed sites with Astro.

## Language

### Site structure

**Site View**:
The editor-managed tree of Nodes that defines a Contensis project's URL structure.
_Avoid_: Sitemap, page tree, nav tree

**Node**:
A single position in the Site View, with a path, a display name and usually a linked entry.
_Avoid_: Page, route

**Root Node**:
The top Node of the Site View, at path `/`.
_Avoid_: Home node

**Menu Visibility**:
The editor-set flag on a Node deciding whether it may appear in navigation; a hidden Node hides its descendants too.
_Avoid_: Hidden page, nav flag

### Navigation

**Primary Navigation**:
The site-wide header menu, built from the top two levels of the Site View beneath the Root Node, led by a Home item.
_Avoid_: Nav menu, main menu, header nav

**Menu Item**:
One entry in the Primary Navigation, labelled with its Node's display name; it links to its Node only when that Node has an entry attached, and is left out if it neither links nor holds children that do.
_Avoid_: Nav link, menu link
