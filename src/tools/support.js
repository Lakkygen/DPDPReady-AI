// ============================================================
// DPDPREADY AI — SUPPORT OPERATIONS
// ============================================================

async function customerContext(env, args = {}) {
  if (!args.email && !args.customerId) {
    throw new Error(
      "email or customerId is required"
    );
  }

  const customers = env.__customers;
  const tickets = env.__tickets;

  if (!customers || !tickets) {
    throw new Error(
      "Customer and ticket clients are not attached"
    );
  }

  const customer = await customers.get({
    id: args.customerId,
    email: args.email,
  });

  if (!customer) {
    return {
      customer: null,
      tickets: [],
      exists: false,
    };
  }

  const ticketList = await tickets.list({
    limit: 50,
  });

  const customerTickets = ticketList.filter(
    (ticket) =>
      ticket.customer_id === customer.id ||
      (
        customer.email &&
        ticket.customer_email &&
        ticket.customer_email.toLowerCase() ===
          customer.email.toLowerCase()
      )
  );

  return {
    exists: true,
    customer,
    tickets: customerTickets,
  };
}

async function createTicket(env, args = {}) {
  if (!env.__tickets) {
    throw new Error(
      "Ticket client is not attached"
    );
  }

  return env.__tickets.create(args);
}

async function updateTicket(env, args = {}) {
  if (!env.__tickets) {
    throw new Error(
      "Ticket client is not attached"
    );
  }

  return env.__tickets.update(args);
}

async function replyByEmail(env, args = {}) {
  if (!args.to) {
    throw new Error("to is required");
  }

  if (!args.subject) {
    throw new Error("subject is required");
  }

  if (!args.html && !args.text) {
    throw new Error("html or text is required");
  }

  if (!args.approved) {
    throw new Error(
      "Support email requires explicit approval"
    );
  }

  if (!env.__email) {
    throw new Error(
      "Email client is not attached"
    );
  }

  return env.__email.send({
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
    approved: true,
    marketing: false,
  });
}

export function createSupportTool(
  env,
  dependencies = {}
) {
  const scopedEnv = {
    ...env,
    __customers:
      dependencies.customers || null,
    __tickets:
      dependencies.tickets || null,
    __email:
      dependencies.email || null,
  };

  return {
    customerContext: (args) =>
      customerContext(scopedEnv, args),

    createTicket: (args) =>
      createTicket(scopedEnv, args),

    updateTicket: (args) =>
      updateTicket(scopedEnv, args),

    replyByEmail: (args) =>
      replyByEmail(scopedEnv, args),
  };
}
