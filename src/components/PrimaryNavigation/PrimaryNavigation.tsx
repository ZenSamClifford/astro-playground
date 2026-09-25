import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '~/components/ui/navigation-menu';
import type { MenuItem } from '~/contensis/primaryNavigation';

interface Props {
  items: MenuItem[];
  currentPath: string;
}

/** Home only matches exactly, otherwise every page would match `/`. Other
 * paths match whole segments so `/blogs` does not match `/blogsx`. */
const isActive = (path: string, currentPath: string, exact = false) =>
  currentPath === path ||
  (!exact && path !== '/' && currentPath.startsWith(`${path}/`));

/** The parent leads its own panel, but only when it has a page to link to.
 * Children at the last level are always linkable: the mapper drops any that
 * are not, since they have no children to fall back on. */
const panelLinks = (item: MenuItem) =>
  item.linkable ? [{ ...item, children: [] }, ...item.children] : item.children;

const PrimaryNavigation = ({ items, currentPath: rawPath }: Props) => {
  // Node paths carry no trailing slash
  const currentPath =
    rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;

  return (
    <NavigationMenu aria-label="Primary" className="max-w-full">
      <NavigationMenuList className="flex-wrap justify-start">
        {items.map(item => (
          <NavigationMenuItem key={item.path}>
            {item.children.length ? (
              <>
                <NavigationMenuTrigger
                  className="aria-[current=true]:bg-muted/50"
                  aria-current={
                    isActive(item.path, currentPath) ? 'true' : undefined
                  }
                >
                  {item.label}
                </NavigationMenuTrigger>
                {/* keepMounted renders the panel links (hidden) into the SSR HTML,
                    otherwise they only exist once the island hydrates */}
                <NavigationMenuContent keepMounted>
                  <ul className="grid w-72 max-w-[calc(100vw-2rem)] gap-1">
                    {panelLinks(item).map(child => (
                      <li key={child.path}>
                        <NavigationMenuLink
                          href={child.path}
                          active={isActive(child.path, currentPath, true)}
                        >
                          {child.label}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink
                href={item.path}
                active={isActive(item.path, currentPath, item.path === '/')}
              >
                {item.label}
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default PrimaryNavigation;
