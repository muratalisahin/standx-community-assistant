import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { COPY, detectLang, saveLang } from "./i18n.js";

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => detectLang());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: (id) => {
        saveLang(id);
        setLangState(id);
      },
      t: COPY[lang] || COPY.en,
    }),
    [lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
