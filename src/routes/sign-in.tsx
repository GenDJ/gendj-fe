import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex text-center justify-center items-center">
      <SignIn />
    </div>
  );
}
