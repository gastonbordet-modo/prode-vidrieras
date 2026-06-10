"use client";

import { useActionState } from "react";
import { deleteUser, type DeleteUserState } from "../actions";

const initialState: DeleteUserState = null;

export function DeleteUserButton({
  userId,
  userNickname,
  disabled,
}: {
  userId: string;
  userNickname: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deleteUser,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `¿Borrar a ${userNickname}? Se borran también sus predicciones.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="text-system-error-dark hover:underline disabled:opacity-50"
        title={state?.error ?? undefined}
      >
        {pending ? "Borrando…" : "Borrar"}
      </button>
      {state?.error && (
        <span role="alert" className="text-system-error-dark ml-2 text-xs">
          {state.error}
        </span>
      )}
    </form>
  );
}
