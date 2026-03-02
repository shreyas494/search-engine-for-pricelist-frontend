import { useEffect, useState } from "react";


function App() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [tyres, setTyres] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(20); // Items per page
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); // Debounced state
  const [brandFilter, setBrandFilter] = useState("");
  const [brands, setBrands] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [fields, setFields] = useState([]); // dynamically detected fields


  // ✅ Debounce Search Term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // ✅ Fetch brands for dropdown
  useEffect(() => {
    fetch(`${API_URL}/api/brands`)
      .then((res) => res.json())
      .then((data) => setBrands(data))
      .catch((err) => console.error("Error fetching brands:", err));
  }, []);

  // ✅ Fetch tyres when brand/search/page changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (brandFilter) params.append("brand", brandFilter);
    if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
    params.append("page", page);
    params.append("limit", limit);

    fetch(`${API_URL}/api/tyres?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        // Handle paginated response
        const resultTyres = data.tyres || [];
        setTyres(resultTyres);
        setTotal(data.total || 0);
        setPages(data.pages || 1);

        // Determine all keys dynamically from current page or initial data
        if (resultTyres.length > 0) {
          const allFields = Array.from(
            new Set(resultTyres.flatMap((item) => Object.keys(item)))
          ).filter((f) => f !== "_id" && f !== "__v"); // ignore internal fields
          setFields(allFields);
        }
      })
      .catch((err) => console.error("Error fetching tyres:", err));
  }, [brandFilter, debouncedSearchTerm, page, limit]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [brandFilter, debouncedSearchTerm]);

  // ✅ Autocomplete suggestions (Now debounced via debouncedSearchTerm)
  useEffect(() => {
    if (!debouncedSearchTerm) {
      setSuggestions([]);
      return;
    }
    const params = new URLSearchParams();
    if (brandFilter) params.append("brand", brandFilter);
    params.append("search", debouncedSearchTerm);
    params.append("limit", 5); // Limit suggestions to 5

    fetch(`${API_URL}/api/tyres?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setSuggestions(data.tyres || []))
      .catch((err) => console.error("Error fetching suggestions:", err));
  }, [debouncedSearchTerm, brandFilter]);

  // ✅ Copy details dynamically
  const copyTyreDetails = (tyre) => {
    const text = fields
      .map((f) => `${f.charAt(0).toUpperCase() + f.slice(1)}: ${tyre[f]}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() =>
      alert("Product details copied to clipboard ✅")
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Tyre Inventory</h1>

      {/* 🔎 Search + Brand Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search by model..."
            className="w-full p-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {suggestions.length > 0 && (
            <ul className="absolute bg-white border w-full mt-1 rounded-lg shadow-lg z-10">
              {suggestions.map((tyre) => (
                <li
                  key={tyre._id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setSearchTerm(tyre.model)}
                >
                  {tyre.model}
                </li>
              ))}
            </ul>
          )}
        </div>

        <select
          className="p-2 border rounded-lg md:w-1/4"
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
        >
          <option value="">All Brands</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      {/* 📋 Tyre Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg mb-4">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {fields.map((field) => (
                <th key={field} className="border p-2 text-left">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </th>
              ))}
              {fields.length > 0 && (
                <th className="border p-2 text-left">Copy</th>
              )}
            </tr>
          </thead>
          <tbody>
            {tyres.length > 0 ? (
              tyres.map((tyre) => (
                <tr key={tyre._id} className="hover:bg-gray-50">
                  {fields.map((field) => (
                    <td key={field} className="border p-2">
                      {tyre[field] || "-"}
                    </td>
                  ))}
                  <td className="border p-2">
                    <button
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => copyTyreDetails(tyre)}
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={fields.length + 1 || 1}
                  className="border p-2 text-center text-gray-500"
                >
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔢 Pagination Controls */}
      {pages > 1 && (
        <div className="flex justify-between items-center bg-white p-4 shadow rounded-lg">
          <span className="text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} products
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className={`px-4 py-2 border rounded-lg ${page === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-gray-50"
                }`}
            >
              Previous
            </button>
            <span className="flex items-center px-4 py-2 border rounded-lg bg-gray-50 font-medium">
              Page {page} of {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
              className={`px-4 py-2 border rounded-lg ${page === pages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-gray-50"
                }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
