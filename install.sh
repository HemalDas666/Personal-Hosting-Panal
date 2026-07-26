#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${CYAN}"
cat << "EOF"
██╗  ██╗███████╗███╗   ███╗ █████╗ ██╗     
██║  ██║██╔════╝████╗ ████║██╔══██╗██║     
███████║█████╗  ██╔████╔██║███████║██║     
██╔══██║██╔══╝  ██║╚██╔╝██║██╔══██║██║     
██║  ██║███████╗██║ ╚═╝ ██║██║  ██║███████╗
╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝
EOF
echo -e "${NC}"

echo -e ""
echo -e "${PURPLE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}  ${WHITE}✦  HOST PANEL — SERVER MANAGEMENT  ✦${NC}  ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════╝${NC}"
echo -e ""

typewriter() {
    local text="$1"
    local color="$2"
    for ((i=0; i<${#text}; i++)); do
        echo -ne "${color}${text:$i:1}${NC}"
        sleep 0.03
    done
    echo ""
}

typewriter "Welcome to Hemal's Hosting Panel" "${GREEN}${BOLD}"
sleep 0.3
typewriter "The ultimate game server management solution" "${CYAN}"
sleep 0.5

echo -e ""
echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║${NC}  ${WHITE}Are you sure you want to install this panel?${NC}  ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
echo -e ""

while true; do
    read -p "$(echo -e "${BOLD}${CYAN}Type ${GREEN}yes${CYAN} or ${RED}no${CYAN}: ${NC}")" confirmation
    case $confirmation in
        [Yy]*)
            echo -e ""
            echo -e "${GREEN}${BOLD}Let's go! Starting installation...${NC}"
            sleep 0.5
            break
            ;;
        [Nn]*)
            echo -e ""
            echo -e "${RED}${BOLD}Installation cancelled. Exiting...${NC}"
            sleep 0.5
            echo -e ""
            echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${CYAN}  Made with ${WHITE}Hemal${NC}"
            echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e ""
            exit 0
            ;;
        *)
            echo -e "${RED}[!] Please answer yes or no.${NC}"
            ;;
    esac
done

install_panel() {
    echo -e ""
    echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}        ${WHITE}Installing Dependencies...${NC}          ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo -e ""
    
    echo -e "${YELLOW}[+] Updating system packages...${NC}"
    sudo apt update -y 2>/dev/null | while read -n 1 c; do echo -n "${c}"; done
    
    echo -e "${YELLOW}[+] Installing curl...${NC}"
    sudo apt install curl -y -qq 2>/dev/null
    
    echo -e "${YELLOW}[+] Setting up Node.js 20.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
    sudo apt install -y nodejs -qq 2>/dev/null
    
    echo -e "${YELLOW}[+] Installing PM2 globally...${NC}"
    sudo npm install -g pm2 -qq 2>/dev/null

    echo -e ""
    echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}       ${WHITE}Downloading Panel Files...${NC}            ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo -e ""
    
    if [ -d "Personal-Hosting-Panal" ]; then
        echo -e "${YELLOW}[!] The 'Personal-Hosting-Panal' folder already exists. Please delete it first or use the update option.${NC}"
        return
    fi

    echo -e "${CYAN}[+] Cloning repository...${NC}"
    git clone https://github.com/HemalDas666/Personal-Hosting-Panal.git
    
    cd Personal-Hosting-Panal || { echo -e "${RED}[!] Failed to enter the directory!${NC}"; return; }
    
    echo -e ""
    echo -e "${GREEN}[✓] Repository cloned successfully!${NC}"
    
    echo -e "${YELLOW}[+] Installing npm packages...${NC}"
    npm i 2>/dev/null
    
    echo -e "${YELLOW}[+] Creating admin user...${NC}"
    npm run createuser
    
    echo -e "${YELLOW}[+] Building the panel...${NC}"
    npm run build 2>/dev/null
    
    echo -e "${YELLOW}[+] Starting panel with PM2...${NC}"
    pm2 start ecosystem.config.cjs
    
    echo -e ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${WHITE}${BOLD}  ✓ Panel Successfully Installed!${NC}        ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Made by ${WHITE}${BOLD}HEMAL${NC}                           ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Panel is now ${GREEN}${BOLD}Online${NC}                        ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    echo -e ""
    
    cd ..
}

update_panel() {
    echo -e ""
    echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}        ${WHITE}Updating Panel...${NC}                   ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo -e ""
    
    if [ -d "Personal-Hosting-Panal" ]; then
        cd Personal-Hosting-Panal || { echo -e "${RED}[!] Failed to enter the directory!${NC}"; return; }
        
        echo -e "${YELLOW}[+] Fetching latest updates...${NC}"
        git stash
        git pull
        
        echo -e "${YELLOW}[+] Updating packages...${NC}"
        npm i 2>/dev/null
        
        echo -e "${YELLOW}[+] Rebuilding...${NC}"
        npm run build 2>/dev/null
        
        echo -e "${YELLOW}[+] Restarting services...${NC}"
        pm2 restart all
        
        echo -e ""
        echo -e "${GREEN}[✓] Panel successfully updated and restarted!${NC}"
        echo -e ""
        
        cd ..
    else
        echo -e "${RED}[!] 'Personal-Hosting-Panal' directory not found! Please install the panel first.${NC}"
    fi
}

uninstall_panel() {
    echo -e ""
    echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}    ${WHITE}Are you sure you want to uninstall?${NC}       ${RED}║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
    echo -e ""
    
    read -p "$(echo -e "${BOLD}${RED}Type 'yes' to confirm: ${NC}")" uninstall_confirm
    if [ "$uninstall_confirm" != "yes" ]; then
        echo -e "${YELLOW}Uninstall cancelled.${NC}"
        return
    fi
    
    echo -e "${RED}[+] Stopping panel...${NC}"
    pm2 delete ecosystem.config.cjs 2>/dev/null
    
    echo -e "${RED}[+] Removing directory...${NC}"
    cd ..
    rm -rf Personal-Hosting-Panal
    
    echo -e ""
    echo -e "${RED}[✓] Panel has been removed.${NC}"
    echo -e ""
}

while true; do
    echo -e "${PURPLE}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}      ${WHITE}${BOLD}HEMAL'S HOST PANEL MANAGER${NC}            ${PURPLE}║${NC}"
    echo -e "${PURPLE}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${PURPLE}║${NC}                                            ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC}  ${GREEN}${BOLD} 1.${NC} ${WHITE}Install Panel${NC}                      ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC}  ${YELLOW}${BOLD} 2.${NC} ${WHITE}Update Panel${NC}                      ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC}  ${RED}${BOLD} 3.${NC} ${WHITE}Uninstall Panel${NC}                    ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC}  ${RED}${BOLD} 4.${NC} ${WHITE}Exit${NC}                               ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC}                                            ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════╝${NC}"
    echo -e ""
    
    read -p "$(echo -e "${CYAN}${BOLD}Choose an option [1-4]: ${NC}")" choice

    case $choice in
        1)
            clear
            install_panel
            ;;
        2)
            clear
            update_panel
            ;;
        3)
            clear
            uninstall_panel
            ;;
        4)
            echo -e ""
            echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
            echo -e "${CYAN}║${NC}   ${WHITE}Thanks for using Hemal's Host Panel!${NC}      ${CYAN}║${NC}"
            echo -e "${CYAN}║${NC}                                            ${CYAN}║${NC}"
            echo -e "${CYAN}║${NC}     ${PURPLE}Made with ❤️  by ${WHITE}${BOLD}Hemal${NC}                ${CYAN}║${NC}"
            echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
            echo -e ""
            exit 0
            ;;
        *)
            echo -e "${RED}[!] Invalid option! Please enter 1, 2, 3, or 4.${NC}"
            sleep 1
            ;;
    esac
    
    echo -e ""
    read -p "$(echo -e "${YELLOW}Press Enter to return to menu...${NC}")"
    clear
done
