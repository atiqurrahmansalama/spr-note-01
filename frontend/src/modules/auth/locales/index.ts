import { registerModuleLocales } from "../../../i18n/I18nContext";
import en from "./en";
import bn from "./bn";
import ar from "./ar";
import ur from "./ur";

registerModuleLocales("auth", { en, bn, ar, ur });

export { en, bn, ar, ur };
