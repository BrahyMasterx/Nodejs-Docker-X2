#!/usr/bin/env bash

# set variables
UUID=${UUID:-'0e059fce-d6c8-4cc2-9e11-9efff358f8b9'}

generate_config() {
  cat > config.json << EOF
{
	"log": {
		"loglevel": "none"
	},
	"inbounds": [{
		"port": 8080,
		"listen": "127.0.0.1",
		"protocol": "vless",
		"settings": {
			"clients": [{
				"id": "${UUID}"
			}],
			"decryption": "none"
		},
		"streamSettings": {
			"network": "ws"
		}
	}],
	"outbounds": [{
		"protocol": "freedom",
		"settings": {}
	}]
}
EOF
}

generate_argo() {
  cat > argo.sh << ABC
#!/usr/bin/env bash

argo_type() {
  if [[ -n "\${ARGO_AUTH}" && -n "\${ARGO_DOMAIN}" ]]; then
    [[ \$ARGO_AUTH =~ TunnelSecret ]] && echo \$ARGO_AUTH > tunnel.json && echo -e "tunnel: \$(cut -d\" -f12 <<< \$ARGO_AUTH)\ncredentials-file: /app/tunnel.json" > tunnel.yml
  else
    ARGO_DOMAIN=\$(cat argo.log | grep -o "info.*https://.*trycloudflare.com" | sed "s@.*https://@@g" | tail -n 1)
  fi
}

export_list() {
  cat > list << EOF
*******************************************
V2-rayN:
----------------------------

vless://${UUID}@icook.hk:443?encryption=none&security=tls&sni=\${ARGO_DOMAIN}&type=ws&host=\${ARGO_DOMAIN}&path=%2F${WSPATH}-vless?ed=2048#Argo-Vless

----------------------------

*******************************************
EOF
  cat list
}

argo_type
export_list
ABC
}

generate_pm2_file() {
  if [[ -n "${ARGO_AUTH}" && -n "${ARGO_DOMAIN}" ]]; then
    [[ $ARGO_AUTH =~ TunnelSecret ]] && ARGO_ARGS="tunnel --edge-ip-version auto --config tunnel.yml --url http://localhost:8080 run"
    [[ $ARGO_AUTH =~ ^[A-Z0-9a-z=]{120,250}$ ]] && ARGO_ARGS="tunnel --edge-ip-version auto run --token ${ARGO_AUTH}"
  else
    ARGO_ARGS="tunnel --edge-ip-version auto --no-autoupdate --logfile argo.log --loglevel info --url http://localhost:8080"
  fi

    cat > ecosystem.config.js << EOF
module.exports = {
  "apps":[
      {
          "name":"web",
          "script":"/app/web.js run"
      },
      {
          "name":"argo",
          "script":"cloudflared",
          "args":"${ARGO_ARGS}"
      }
  ]
}
EOF
  else
    cat > ecosystem.config.js << EOF
module.exports = {
  "apps":[
      {
          "name":"web",
          "script":"/app/web.js run"
      },
      {
          "name":"argo",
          "script":"cloudflared",
          "args":"${ARGO_ARGS}"
      }
  ]
}
EOF
  fi
}

generate_config
generate_argo
generate_pm2_file
[ -e argo.sh ] && bash argo.sh
[ -e ecosystem.config.js ] && pm2 start