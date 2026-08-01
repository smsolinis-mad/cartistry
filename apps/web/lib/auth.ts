export function setUserCookie(user: any) {
  if (typeof window === 'undefined') return;

  document.cookie = `user=${JSON.stringify(user)}; path=/; max-age=${60 * 60 * 24 * 7}`;
}

export function getUserCookie() {
  if (typeof window === 'undefined') return null;

  const name = 'user=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');

  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      try {
        return JSON.parse(cookie.substring(name.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function getUserId() {
  if (typeof window === 'undefined') return null;

  const user = getUserCookie();
  return user?.id || null;
}

export function clearUserCookie() {
  if (typeof window === 'undefined') return;

  document.cookie = 'user=; path=/; max-age=0';
}
