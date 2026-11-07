// Design-sync only: stands in for @remix-run/react so components render without a Remix router.
import React from "react";

export const Link = React.forwardRef<HTMLAnchorElement, any>(function Link({ to, prefetch, reloadDocument, ...rest }, ref) {
  return <a ref={ref} href={typeof to === "string" ? to : "#"} {...rest} />;
});
export const NavLink = Link;
export function Form({ method, action, ...rest }: any) {
  return <form method={method} action={action} onSubmit={(e) => e.preventDefault()} {...rest} />;
}
export const useLocation = () => ({ pathname: "/", search: "", hash: "", state: null, key: "ds" });
export const useSubmit = () => () => {};
export const useNavigate = () => () => {};
