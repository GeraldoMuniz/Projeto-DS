FROM quay.io/keycloak/keycloak:26.8.2
COPY realm-production.json /opt/keycloak/data/import/realm-production.json
EXPOSE 10000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--import-realm"]
