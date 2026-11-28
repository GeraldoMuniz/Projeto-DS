FROM quay.io/keycloak/keycloak:26.8.2
ENV KC_DB=postgres
# Uma unica instancia no Render: sem cluster JGroups, reduz o consumo de RAM.
ENV KC_CACHE=local
ENV KC_HTTP_ENABLED=true
ENV KC_HTTP_RELATIVE_PATH=/auth
ENV KC_HTTP_PORT=10000
COPY realm-production.json /opt/keycloak/data/import/realm-production.json
RUN /opt/keycloak/bin/kc.sh build
EXPOSE 10000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--import-realm"]
