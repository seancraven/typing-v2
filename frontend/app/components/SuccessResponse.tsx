import { useEffect } from "react";
import { useNavigate } from "react-router";
export default function SuccessResponse({
  msg,
  success_redirect,
}: {
  msg: string;
  success_redirect: string;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    setTimeout(() => navigate(success_redirect), 500);
  });
  return <div className="rounded bg-green-100 p-4 text-green-800">{msg}</div>;
}
