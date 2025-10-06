#!/bin/bash


#clone of Modsecurity and run setup
cd /opt && git clone https://github.com/owasp-modsecurity/ModSecurity.git
cd Modsecurity
git submodule init && git submodule update
sh ./build.sh
sh ./configure
make
make install

#download of Modsecurity Nginx connector
add-apt-repository ppa:ondrej/nginx -y
apt update && apt install nginx -y

NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9.]\+')
cd /opt && wget https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz
tar -xzvf nginx-$NGINX_VERSION.tar.gz
cd nginx-$NGINX_VERSION
sh ./configure --with-compat --add-dynamic-module=/opt/ModSecurity-nginx
make
make modules

# Coppying modsecurity module to nginx modules folder
cp objs/ngx_http_modsecurity_module.so /etc/nginx/modules-enabled/
cp /opt/ModSecurity/modsecurity.conf-recommended /etc/nginx/modsecurity.conf
cp /opt/ModSecurity/unicode.mapping /etc/nginx/unicode.mapping

# Enable ModSecurity in nginx.conf
sed -i 'load_module modules/ngx_http_modsecurity_module.so;' /etc/nginx/nginx.conf
sed -i 'modsecurity on;' /etc/nginx/sites-enabled/default
sed -i 'modsecurity_rules_file /etc/nginx/modsecurity.conf;' /etc/nginx/sites-enabled/default
sed -i 'SecRuleEngine On' /etc/nginx/modsecurity.conf
nginx -t


# Downloading OWASP CRS rules
cd /opt && git clone https://github.com/coreruleset/coreruleset.git /etc/nginx/owasp-crs
cp /etc/nginx/owasp-crs/crs-setup.conf{.example,}
echo "Include owasp-crs/crs-setup.conf" >> /etc/nginx/modsecurity.conf
echo "Include /etc/nginx/owasp-crs/rules/*.conf" >> /etc/nginx/modsecurity.conf
nginx -t

nginx -g 'daemon off;'