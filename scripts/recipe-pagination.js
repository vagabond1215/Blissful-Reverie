;(function (global) {
  const normalizePageSize = (value, fallback = 24) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const getPageCount = (totalItems, pageSize = 24) => {
    const total = Math.max(0, Number.parseInt(String(totalItems), 10) || 0);
    const size = normalizePageSize(pageSize);
    return Math.max(1, Math.ceil(total / size));
  };

  const clampPage = (page, totalItems, pageSize = 24) => {
    const parsed = Number.parseInt(String(page), 10) || 1;
    return Math.min(Math.max(1, parsed), getPageCount(totalItems, pageSize));
  };

  const paginateItems = (items, page = 1, pageSize = 24) => {
    const source = Array.isArray(items) ? items : [];
    const size = normalizePageSize(pageSize);
    const currentPage = clampPage(page, source.length, size);
    const startIndex = (currentPage - 1) * size;
    const endIndex = Math.min(source.length, startIndex + size);
    return {
      items: source.slice(startIndex, endIndex),
      currentPage,
      pageCount: getPageCount(source.length, size),
      pageSize: size,
      totalItems: source.length,
      startIndex,
      endIndex,
    };
  };

  const api = { normalizePageSize, getPageCount, clampPage, paginateItems };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulRecipePagination = Object.assign({}, global.BlissfulRecipePagination || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
