package com.kazipay.common.tenant;

import org.springframework.jdbc.datasource.DelegatingDataSource;

import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

public class TenantAwareDataSource extends DelegatingDataSource {
    public TenantAwareDataSource(DataSource targetDataSource) {
        super(targetDataSource);
    }

    @Override
    public Connection getConnection() throws SQLException {
        return prepare(super.getConnection());
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return prepare(super.getConnection(username, password));
    }

    private Connection prepare(Connection connection) throws SQLException {
        var tenantId = TenantContext.get().map(UUID::toString).orElse("");
        try (PreparedStatement statement = connection.prepareStatement("SELECT set_config('app.tenant_id', ?, false)")) {
            statement.setString(1, tenantId);
            statement.execute();
        }

        return (Connection) Proxy.newProxyInstance(
                Connection.class.getClassLoader(),
                new Class<?>[]{Connection.class},
                (proxy, method, args) -> {
                    if (method.getName().equals("close")) {
                        reset(connection);
                    }
                    try {
                        return method.invoke(connection, args);
                    } catch (InvocationTargetException exception) {
                        throw exception.getCause();
                    }
                });
    }

    private void reset(Connection connection) {
        try (PreparedStatement statement = connection.prepareStatement("SELECT set_config('app.tenant_id', '', false)")) {
            statement.execute();
        } catch (SQLException ignored) {
            // The pool will discard or reset a broken connection.
        }
    }
}