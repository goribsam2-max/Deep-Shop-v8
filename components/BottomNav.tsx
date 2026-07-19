import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { triggerHaptic } from "../lib/haptics";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const [cartCount, setCartCount] = React.useState(0);

  React.useEffect(() => {
    const updateCount = () => {
      try {
        const cartStr = localStorage.getItem('f_cart');
        let cart = [];
        try { cart = cartStr && cartStr !== "undefined" ? JSON.parse(cartStr) : []; } catch(e){}
        if (Array.isArray(cart)) {
          const validItems = cart.filter(item => item && (item.id || item.productId));
          const count = validItems.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
          setCartCount(count);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        setCartCount(0);
      }
    };
    updateCount();
    window.addEventListener("update_cart", updateCount);
    return () => window.removeEventListener("update_cart", updateCount);
  }, []);

  const links = [
    { to: "/", iconKey: "home", label: "Home" },
    { to: "/affiliate", iconKey: "profile-affiliate", label: "Creator" },
    { to: "/aichat", iconKey: "comment-dots", label: "Chat" },
    { to: "/cart", iconKey: "shopping-cart", label: "Cart" },
    { to: "/profile", iconKey: "user", label: "Profile" },
  ];

  // Hide BottomNav on product detail pages where the custom action bar takes over
  if (location.pathname.startsWith("/product/")) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-zinc-900 z-[100] md:hidden border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex w-full justify-between items-center px-4 h-[65px]">
          {links.map((link) => {
            const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
            
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => triggerHaptic()}
                className="flex flex-col items-center justify-center flex-1 h-full relative group"
              >
                {isActive && (
                  <div className="absolute top-0 w-8 h-[3px] bg-[#1cdb5e] rounded-b-full"></div>
                )}
                <div className="relative flex items-center justify-center">
                  <Icon
                    name={link.iconKey}
                    className={`w-5 h-5 mb-1 transition-all duration-300 ${isActive ? "text-[#1cdb5e] scale-110" : "inactive-nav-icon text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`}
                    solid={isActive}
                  />
                  {link.to === "/cart" && cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-[#1cdb5e] text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-[#1cdb5e]" : "text-zinc-400"}`}>
                  {link.label}
                </span>
              </NavLink>
            );
          })}
      </div>
    </div>
  );
};

export default BottomNav;
