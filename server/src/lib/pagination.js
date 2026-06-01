export function pagination(req, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || defaultLimit), 1), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function pagedResponse(rows, total, page, limit) {
  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

