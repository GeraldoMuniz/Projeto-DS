import { type SidebarData } from "@cincoders/cinnamon";
import { ListChecks, Users } from "lucide-react";
import { Links } from "./enums";
import cincodersLogo from "../assets/icons/logo_cincoders-icon.svg";

/**
 * Conteúdo da sidebar (Drawer aberto pelo botão de menu do Navbar).
 * `navMain` fica sempre visível; `navGroups` são seções colapsáveis.
 */
export const sidebar: SidebarData = {
  appName: "Gerinfra CIn-UFPE",
  // Import de módulo (não um caminho em public/): o bundler resolve a URL
  // final já considerando o base configurado (VITE_BASE_URL), do mesmo
  // jeito que `cin-logo.svg` em pages/login.
  appLogoSrc: cincodersLogo,
  navMain: [
    {
      id: "solicitante",
      title: "Meus chamados",
      href: Links.REQUESTER,
      IconComponent: ListChecks,
    },
    {
      id: "gestao",
      title: "Gestão de manutenções",
      href: Links.MANAGER,
      IconComponent: Users,
    },
    {
      id: "equipe",
      title: "Minha equipe",
      href: Links.OPERATOR,
      IconComponent: ListChecks,
    },
  ],
};
