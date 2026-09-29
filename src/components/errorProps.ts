/** aria props linking an input to its error message. */
export function errorProps(id: string, message?: string) {
  return message
    ? { "aria-invalid": true as const, "aria-describedby": id }
    : {};
}
