package com.kazipay.clients.api;

import com.kazipay.clients.application.ClientService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import static com.kazipay.clients.api.ClientDtos.*;

@RestController
@RequestMapping("/api/v1/clients")
public class ClientController {
    private final ClientService service;

    public ClientController(ClientService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("@perm.has('CLIENT_READ')")
    public List<ClientView> list() { return service.list(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perm.has('CLIENT_WRITE')")
    public ClientView create(@Valid @RequestBody ClientRequest request) { return service.create(request); }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.has('CLIENT_READ')")
    public ClientView get(@PathVariable UUID id) { return service.get(id); }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('CLIENT_WRITE')")
    public ClientView update(@PathVariable UUID id, @Valid @RequestBody ClientRequest request) { return service.update(id, request); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perm.has('CLIENT_WRITE')")
    public void archive(@PathVariable UUID id) { service.archive(id); }

    @GetMapping("/{id}/contacts")
    @PreAuthorize("@perm.has('CLIENT_READ')")
    public List<ContactView> contacts(@PathVariable UUID id) { return service.listContacts(id); }

    @PostMapping("/{id}/contacts")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perm.has('CLIENT_WRITE')")
    public ContactView addContact(@PathVariable UUID id, @Valid @RequestBody ContactRequest request) { return service.addContact(id, request); }

    @DeleteMapping("/{id}/contacts/{contactId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perm.has('CLIENT_WRITE')")
    public void deleteContact(@PathVariable UUID id, @PathVariable UUID contactId) { service.deleteContact(id, contactId); }

    @PostMapping(value = "/import", consumes = "text/csv")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("@perm.has('CLIENT_WRITE')")
    public ImportResult importCsv(@RequestBody String csv) { return new ImportResult(service.importCsv(csv)); }

    @GetMapping(value = "/export", produces = "text/csv")
    @PreAuthorize("@perm.has('CLIENT_READ')")
    public void exportCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=clients.csv");
        response.getWriter().write(service.exportCsv());
    }

    @PostMapping("/{id}/portal-invite")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("@perm.has('CLIENT_WRITE')")
    public void portalInvite(@PathVariable UUID id, @Valid @RequestBody PortalInviteRequest request, Authentication authentication) {
        service.portalInvite(id, request.email(), userId(authentication));
    }

    private UUID userId(Authentication authentication) {
        if (authentication.getPrincipal() instanceof Jwt jwt) return UUID.fromString(jwt.getSubject());
        return UUID.fromString(authentication.getName());
    }

    public record ImportResult(int imported) { }
}