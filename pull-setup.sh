#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"
IMAGE="ghcr.io/chatgptuk/ldc-shop:latest"

# Detect docker compose command (V2 plugin or V1 standalone)
detect_compose() {
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        return 1
    fi
    return 0
}

if ! detect_compose; then
    echo -e "${YELLOW}未检测到 Docker Compose，正在自动安装...${NC}"
    if [ -f /etc/debian_version ]; then
        apt-get update -qq > /dev/null 2>&1
        apt-get install -y docker-compose-plugin > /dev/null 2>&1 || apt-get install -y docker-compose > /dev/null 2>&1
    elif [ -f /etc/redhat-release ]; then
        yum install -y docker-compose-plugin > /dev/null 2>&1 || yum install -y docker-compose > /dev/null 2>&1
    fi

    if ! detect_compose; then
        echo -e "${RED}Docker Compose 安装失败，请手动安装后重试${NC}"
        echo -e "  Debian/Ubuntu: apt-get install docker-compose-plugin"
        echo -e "  CentOS/RHEL:   yum install docker-compose-plugin"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Docker Compose 安装成功"
fi

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   LDC Shop Docker 一键部署（拉取）   ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

# Helper: prompt with default value
prompt() {
    local var_name="$1"
    local prompt_text="$2"
    local default_val="$3"
    local is_secret="$4"

    if [ -n "$default_val" ]; then
        prompt_text="${prompt_text} [${default_val}]"
    fi

    if [ "$is_secret" = "true" ]; then
        echo -en "${BOLD}${prompt_text}: ${NC}"
        value=""
        while IFS= read -rs -n1 char; do
            if [[ -z "$char" ]]; then
                break
            elif [[ "$char" == $'\x7f' || "$char" == $'\b' ]]; then
                if [ -n "$value" ]; then
                    value="${value%?}"
                    echo -en "\b \b"
                fi
            else
                value+="$char"
                echo -en "*"
            fi
        done
        echo ""
    else
        echo -en "${BOLD}${prompt_text}: ${NC}"
        read -r value
    fi

    if [ -z "$value" ]; then
        value="$default_val"
    fi

    eval "$var_name='$value'"
}

# Helper: prompt yes/no
prompt_yn() {
    local var_name="$1"
    local prompt_text="$2"
    local default_val="$3"

    echo -en "${BOLD}${prompt_text} (y/n) [${default_val}]: ${NC}"
    read -r value

    if [ -z "$value" ]; then
        value="$default_val"
    fi

    case "$value" in
        [Yy]*) eval "$var_name=true" ;;
        *) eval "$var_name=false" ;;
    esac
}

# Generate random secret
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        head -c 32 /dev/urandom | base64
    fi
}

echo -e "${GREEN}━━━ 基础配置（必填）━━━${NC}"
echo ""

prompt APP_URL "站点 URL（如 https://shop.example.com）" ""
while [ -z "$APP_URL" ]; do
    echo -e "${RED}站点 URL 不能为空，请输入你的域名（含 https://）${NC}"
    prompt APP_URL "站点 URL（如 https://shop.example.com）" ""
done
prompt PORT "映射端口" "3000"

echo ""
echo -e "${GREEN}━━━ Linux DO Connect OAuth（必填）━━━${NC}"
echo -e "${YELLOW}在 https://connect.linux.do 创建应用获取${NC}"
echo ""

prompt OAUTH_CLIENT_ID "Client ID" ""
while [ -z "$OAUTH_CLIENT_ID" ]; do
    echo -e "${RED}Client ID 不能为空${NC}"
    prompt OAUTH_CLIENT_ID "Client ID" ""
done

prompt OAUTH_CLIENT_SECRET "Client Secret" "" true
while [ -z "$OAUTH_CLIENT_SECRET" ]; do
    echo -e "${RED}Client Secret 不能为空${NC}"
    prompt OAUTH_CLIENT_SECRET "Client Secret" "" true
done

echo ""
echo -e "${GREEN}━━━ EPay 支付配置（必填）━━━${NC}"
echo ""

prompt MERCHANT_ID "商户 ID" ""
while [ -z "$MERCHANT_ID" ]; do
    echo -e "${RED}商户 ID 不能为空${NC}"
    prompt MERCHANT_ID "商户 ID" ""
done

prompt MERCHANT_KEY "商户密钥" "" true
while [ -z "$MERCHANT_KEY" ]; do
    echo -e "${RED}商户密钥不能为空${NC}"
    prompt MERCHANT_KEY "商户密钥" "" true
done

echo ""
echo -e "${GREEN}━━━ 管理员配置 ━━━${NC}"
echo ""

prompt ADMIN_USERS "管理员用户名（多个用逗号分隔）" "admin"

PAY_URL="https://credit.linux.do/epay/pay/submit.php"

echo ""
echo -e "${GREEN}━━━ GitHub OAuth（可选，回车跳过）━━━${NC}"
echo -e "${YELLOW}在 https://github.com/settings/developers 创建 OAuth App${NC}"
echo ""

prompt GITHUB_ID "GitHub Client ID" ""
prompt GITHUB_SECRET "GitHub Client Secret" "" true

# Generate AUTH_SECRET
AUTH_SECRET=$(generate_secret)

echo ""
echo -e "${CYAN}━━━ 生成配置文件 ━━━${NC}"
echo ""

# Write .env file
cat > "$ENV_FILE" <<EOF
# === LDC Shop Docker 配置 ===
# 由 pull-setup.sh 自动生成于 $(date)

# 站点（外部访问地址，服务端运行时使用）
APP_URL=${APP_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}
# NextAuth: AUTH_URL 由 entrypoint.sh 自动从 APP_URL 派生，无需手动设置
AUTH_TRUST_HOST=true
AUTH_SECRET=${AUTH_SECRET}

# Linux DO Connect OAuth
OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}

# EPay 支付
MERCHANT_ID=${MERCHANT_ID}
MERCHANT_KEY=${MERCHANT_KEY}
PAY_URL=${PAY_URL}

# 管理员
ADMIN_USERS=${ADMIN_USERS}

# SQLite 数据库
DATABASE_PATH=/app/data/ldc-shop.sqlite

# GitHub OAuth 登录（可选）
GITHUB_ID=${GITHUB_ID}
GITHUB_SECRET=${GITHUB_SECRET}

# Telegram / Bark / 邮件通知：登录后在管理后台配置，无需在此设置
EOF

echo -e "${GREEN}✓${NC} .env 文件已生成"

# Write docker-compose.yml
cat > "$COMPOSE_FILE" <<EOF
services:
  app:
    container_name: ldc-shop
    image: ${IMAGE}
    restart: always
    ports:
      - "${PORT}:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
EOF

echo -e "${GREEN}✓${NC} docker-compose.yml 已生成"

# Create data directory with open permissions for container
mkdir -p data && chmod 777 data
echo -e "${GREEN}✓${NC} data 目录已创建"

echo ""
echo -e "${CYAN}━━━ 配置摘要 ━━━${NC}"
echo ""
echo -e "  镜像:            ${BOLD}${IMAGE}${NC}"
echo -e "  站点地址:        ${BOLD}${APP_URL}${NC}"
echo -e "  映射端口:        ${BOLD}${PORT}${NC}"
echo -e "  管理员:          ${BOLD}${ADMIN_USERS}${NC}"
if [ -n "$GITHUB_ID" ]; then
echo -e "  GitHub 登录:     ${GREEN}已配置${NC}"
else
echo -e "  GitHub 登录:     ${YELLOW}未配置（可后续编辑 .env 添加）${NC}"
fi
echo ""
echo -e "  ${YELLOW}Telegram/Bark/邮件通知: 启动后在管理后台配置${NC}"
echo ""

prompt_yn DO_START "是否立即拉取镜像并启动？" "y"

if [ "$DO_START" = "true" ]; then
    echo ""
    echo -e "${CYAN}正在拉取镜像并启动容器...${NC}"
    echo ""
    $COMPOSE_CMD pull
    $COMPOSE_CMD up -d
    echo ""
    echo -e "${GREEN}${BOLD}✓ LDC Shop 已启动！${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}稍后可手动启动:${NC}"
    echo ""
    echo "  $COMPOSE_CMD pull && $COMPOSE_CMD up -d"
    echo ""
fi

# --- Reverse proxy config ---
DOMAIN="${APP_URL#https://}"
DOMAIN="${DOMAIN#http://}"

echo -e "${CYAN}━━━ 反向代理配置 ━━━${NC}"
echo ""
echo -e "  容器监听端口 ${BOLD}${PORT}${NC}，需要配置反向代理才能通过域名 ${BOLD}${DOMAIN}${NC} 访问。"
echo ""

HAS_NGINX=false
if command -v nginx &> /dev/null 2>&1 || systemctl is-active --quiet nginx 2>/dev/null; then
    HAS_NGINX=true
fi

if [ "$HAS_NGINX" = "true" ]; then
    echo -e "  ${GREEN}检测到 Nginx 已安装${NC}，建议直接用 Nginx 反代（如宝塔面板可在面板中配置）。"
    echo ""
    echo -e "  ${BOLD}Nginx 反代配置：${NC}"
    echo ""
    echo "    server {"
    echo "        listen 443 ssl;"
    echo "        server_name ${DOMAIN};"
    echo ""
    echo "        ssl_certificate     /path/to/cert.pem;"
    echo "        ssl_certificate_key /path/to/key.pem;"
    echo ""
    echo "        location / {"
    echo "            proxy_pass http://127.0.0.1:${PORT};"
    echo "            proxy_set_header Host \$host;"
    echo "            proxy_set_header X-Real-IP \$remote_addr;"
    echo "            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
    echo "            proxy_set_header X-Forwarded-Proto \$scheme;"
    echo "            proxy_set_header X-Forwarded-Host \$host;"
    echo "        }"
    echo "    }"
    echo ""
    echo -e "  ${YELLOW}宝塔面板用户：${NC}添加站点 → 域名填 ${BOLD}${DOMAIN}${NC} → 设置 → 反向代理 → 目标 URL 填 ${BOLD}http://127.0.0.1:${PORT}${NC}"
    echo ""
else
    prompt_yn SETUP_CADDY "未检测到 Nginx，是否自动安装 Caddy（自动 HTTPS）？" "n"

    if [ "$SETUP_CADDY" = "true" ]; then
        echo ""

        if ! command -v caddy &> /dev/null; then
            echo -e "${CYAN}正在安装 Caddy...${NC}"

            if [ -f /etc/debian_version ]; then
                apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl > /dev/null 2>&1 || true
                curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
                curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
                apt-get update -qq > /dev/null 2>&1
                apt-get install -y caddy > /dev/null 2>&1
            elif [ -f /etc/redhat-release ]; then
                yum install -y yum-plugin-copr > /dev/null 2>&1 || dnf install -y 'dnf-command(copr)' > /dev/null 2>&1 || true
                yum copr enable -y @caddy/caddy > /dev/null 2>&1 || dnf copr enable -y @caddy/caddy > /dev/null 2>&1 || true
                yum install -y caddy > /dev/null 2>&1 || dnf install -y caddy > /dev/null 2>&1
            else
                echo -e "${RED}无法自动安装 Caddy，请参考 https://caddyserver.com/docs/install 手动安装${NC}"
                SETUP_CADDY=false
            fi

            if command -v caddy &> /dev/null; then
                echo -e "${GREEN}✓${NC} Caddy 安装成功"
            else
                echo -e "${RED}✗ Caddy 安装失败，请手动安装后配置${NC}"
                SETUP_CADDY=false
            fi
        else
            echo -e "${GREEN}✓${NC} Caddy 已安装"
        fi
    fi

    if [ "$SETUP_CADDY" = "true" ]; then
        CADDYFILE="/etc/caddy/Caddyfile"
        cat > "$CADDYFILE" <<CADDYEOF
${DOMAIN} {
    reverse_proxy localhost:${PORT}
}
CADDYEOF

        echo -e "${GREEN}✓${NC} Caddyfile 已写入 ${CADDYFILE}"

        if systemctl is-active --quiet caddy 2>/dev/null; then
            systemctl reload caddy
            echo -e "${GREEN}✓${NC} Caddy 已重新加载"
        else
            systemctl enable caddy > /dev/null 2>&1 || true
            systemctl start caddy
            echo -e "${GREEN}✓${NC} Caddy 已启动"
        fi

        echo ""
        echo -e "${GREEN}${BOLD}━━━ 部署完成！━━━${NC}"
        echo ""
        echo -e "  ${BOLD}最后一步：${NC}请到你的域名 DNS 管理面板，添加一条 A 记录："
        echo ""
        echo -e "    主机记录:  ${BOLD}${DOMAIN}${NC}"
        echo -e "    记录类型:  ${BOLD}A${NC}"
        echo -e "    记录值:    ${BOLD}你的服务器公网 IP${NC}"
        echo ""
        echo -e "  DNS 生效后，访问 ${BOLD}${APP_URL}${NC} 即可（Caddy 自动申请 HTTPS 证书）。"
        echo ""
    else
        echo ""
        echo -e "  手动配置 Nginx 反代示例："
        echo ""
        echo "    server {"
        echo "        listen 443 ssl;"
        echo "        server_name ${DOMAIN};"
        echo "        ssl_certificate     /path/to/cert.pem;"
        echo "        ssl_certificate_key /path/to/key.pem;"
        echo "        location / {"
        echo "            proxy_pass http://127.0.0.1:${PORT};"
        echo "            proxy_set_header Host \$host;"
        echo "            proxy_set_header X-Real-IP \$remote_addr;"
        echo "            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
        echo "            proxy_set_header X-Forwarded-Proto \$scheme;"
        echo "            proxy_set_header X-Forwarded-Host \$host;"
        echo "        }"
        echo "    }"
        echo ""
    fi
fi

echo -e "${CYAN}常用命令:${NC}"
echo "  查看日志:   $COMPOSE_CMD logs -f"
echo "  停止服务:   $COMPOSE_CMD down"
echo "  重启服务:   $COMPOSE_CMD down && $COMPOSE_CMD up -d"
echo "  更新镜像:   $COMPOSE_CMD pull && $COMPOSE_CMD up -d"
echo ""
