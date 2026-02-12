import { useState, useMemo } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminImport = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [rawText, setRawText] = useState("");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [status, setStatus] = useState("");

    // Identify dynamic headers from the data
    const headers = useMemo(() => {
        if (!parsedData || parsedData.length === 0) return ["brand", "model", "type", "dp", "mrp"];
        // Extract all unique keys from all objects to be safe, but usually just the first or majority
        const allKeys = new Set();
        parsedData.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
        return Array.from(allKeys).filter(k => k.toLowerCase() !== "sr no" && k.toLowerCase() !== "sr. no" && k.toLowerCase() !== "s.no");
    }, [parsedData]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus("");
        setRawText("");
    };

    const handleParse = async () => {
        if (!file) {
            alert("Please select a PDF file first");
            return;
        }

        setLoading(true);
        setStatus("⌛ Scanning PDF... using dynamic header detection.");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/admin/parse-pdf`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse PDF");

            const { extractedData, rawText: text } = data;
            setRawText(text || "");

            if (Array.isArray(extractedData) && extractedData.length > 0) {
                setParsedData(extractedData);
                setStatus(`✅ Scan Complete: Found ${extractedData.length} items. (Using ${rawText.length > 2000 ? 'High-Performance Scanner' : 'Intelligent Scan'}).`);
            } else {
                setParsedData([]);
                setStatus("⚠️ AI Quota Busy: No automatic results found. Please use '+ Add Row' to fill data manually or try again in a few minutes.");
            }
        } catch (error) {
            console.error(error);
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        const newRow = {};
        headers.forEach(h => newRow[h] = "");
        setParsedData([newRow, ...parsedData]);
    };

    const handleDataChange = (index, field, value) => {
        const newData = [...parsedData];
        newData[index][field] = value;
        setParsedData(newData);
    };

    const handleDeleteRow = (index) => {
        setParsedData(parsedData.filter((_, i) => i !== index));
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;
        setImporting(true);

        // Smart Mapping for Database (brand, model, type, dp, mrp)
        const mappedData = parsedData.map(item => {
            const newItem = { ...item };

            // Look for brand if not explicitly there (AI should handle brand though)
            const brandKey = Object.keys(item).find(k => k.toLowerCase() === "brand");
            const modelKey = Object.keys(item).find(k => k.toLowerCase().includes("model") || k.toLowerCase().includes("pattern") || k.toLowerCase().includes("item"));
            const typeKey = Object.keys(item).find(k => k.toLowerCase() === "type" || k.toLowerCase().includes("category"));
            const dpKey = Object.keys(item).find(k => k.toLowerCase().includes("dp") || k.toLowerCase().includes("dealer") || k.toLowerCase().includes("net"));
            const mrpKey = Object.keys(item).find(k => k.toLowerCase().includes("mrp") || k.toLowerCase().includes("list") || k.toLowerCase().includes("price"));

            return {
                brand: brandKey ? item[brandKey] : (item.brand || "MRF"),
                model: item[modelKey] || item.model || "",
                type: item[typeKey] || item.type || "Tubeless",
                dp: parseFloat(String(item[dpKey] || item.dp || 0).replace(/[^0-9.]/g, "")),
                mrp: parseFloat(String(item[mrpKey] || item.mrp || 0).replace(/[^0-9.]/g, ""))
            };
        });

        try {
            const res = await fetch(`${API_URL}/api/admin/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mappedData),
            });

            if (res.ok) {
                alert("SUCCESS! Data saved to Database.");
                setParsedData([]);
                setFile(null);
                setStatus("Import Complete.");
            } else {
                alert("Failed to save data.");
            }
        } catch (error) {
            alert("Error saving data.");
        } finally {
            setImporting(false);
        }
    };

    const downloadCSV = () => {
        if (parsedData.length === 0) return;
        const csv = [headers.join(","), ...parsedData.map(r => headers.map(f => JSON.stringify(r[f] || "")).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pricelist_dynamic.csv";
        a.click();
    };

    return (
        <div className="min-h-screen bg-white p-4 md:p-10 font-sans">
            <div className="max-w-[1600px] mx-auto">
                <header className="flex justify-between items-center mb-10 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">DYNAMIC <span className="text-blue-600">SCANNER</span></h1>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mt-1">Automatic Header Detection & Global Branding</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => { if (window.confirm("Clear all rows?")) setParsedData([]) }}
                            className="px-6 py-2 text-gray-400 hover:text-red-500 font-bold transition text-xs"
                        >
                            CLEAR ALL
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={importing || parsedData.length === 0}
                            className={`px-10 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-xl transition hover:bg-blue-700 disabled:opacity-30 disabled:grayscale`}
                        >
                            {importing ? "SAVING..." : "SAVE TO DATABASE"}
                        </button>
                    </div>
                </header>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                    <div className="flex-1 w-full text-left">
                        <span className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Target PDF Pricelist</span>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                    <button
                        onClick={handleParse}
                        disabled={!file || loading}
                        className="px-8 py-4 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "SCANNING..." : "INTELLIGENT SCAN"}
                    </button>
                    <button
                        onClick={handleRawImport}
                        disabled={!rawText && !file}
                        className="px-8 py-4 bg-white border-2 border-gray-900 text-gray-900 rounded-xl font-black text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                    >
                        RAW MODE
                    </button>
                    <div className="h-10 w-px bg-gray-200 hidden md:block"></div>
                    <div className="flex gap-2">
                        <button onClick={handleAddRow} className="px-5 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-50 transition shadow-sm">+ ADD ROW</button>
                        <button onClick={downloadCSV} className="px-5 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-50 transition shadow-sm">📥 CSV</button>
                    </div>
                </div>

                {status && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-sm font-bold flex items-center gap-3 animate-fade-in">
                        <span className="p-1 bg-blue-600 text-white rounded-md text-[10px]">INFO</span>
                        {status}
                    </div>
                )}

                <div className="bg-white border-2 border-gray-200 rounded-3xl overflow-hidden shadow-2xl transition-all">
                    <div className="bg-gray-100 p-4 px-6 border-b flex justify-between items-center">
                        <h2 className="text-xs font-black text-gray-500 tracking-widest uppercase">Pricelist Data Grid</h2>
                        {rawText && (
                            <details className="text-[10px] font-bold text-blue-600 cursor-pointer">
                                <summary>VIEW PDF SOURCE REFERENCE</summary>
                                <pre className="mt-4 p-4 bg-gray-900 text-green-400 text-[10px] rounded-xl overflow-auto max-h-40 whitespace-pre-wrap font-mono leading-relaxed text-left">
                                    {rawText}
                                </pre>
                            </details>
                        )}
                    </div>
                    <div className="overflow-x-auto max-h-[70vh]">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 bg-gray-50 shadow-sm z-10 border-b">
                                <tr className="text-[10px] font-black text-gray-400 text-left uppercase">
                                    <th className="p-3 w-12 text-center bg-gray-50">#</th>
                                    {headers.map((h, i) => (
                                        <th key={i} className={`p-3 border-l bg-gray-50 ${h.toLowerCase().includes("price") || h.toLowerCase().includes("mrp") || h.toLowerCase() === "dp" ? "text-right" : ""}`}>
                                            {h.replace(/_/g, " ")}
                                        </th>
                                    ))}
                                    <th className="p-3 border-l w-12 text-center bg-gray-50"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={headers.length + 2} className="py-20 text-center text-gray-300 font-bold uppercase text-xs tracking-widest">
                                            Grid Empty. Upload PDF or Add Row.
                                        </td>
                                    </tr>
                                ) : (
                                    parsedData.map((row, idx) => (
                                        <tr key={idx} className="border-b last:border-0 hover:bg-blue-50/50 transition">
                                            <td className="p-3 text-center text-gray-300 font-bold text-[10px]">{idx + 1}</td>
                                            {headers.map((h, i) => (
                                                <td key={i} className="p-0 border-l">
                                                    <input
                                                        value={row[h] || ""}
                                                        onChange={e => handleDataChange(idx, h, e.target.value)}
                                                        className={`w-full h-12 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent ${h.toLowerCase() === "brand" ? "font-bold capitalize" : ""} ${h.toLowerCase().includes("price") || h.toLowerCase().includes("mrp") || h.toLowerCase() === "dp" ? "text-right font-black" : ""}`}
                                                        placeholder={h.toUpperCase()}
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-0 border-l text-center">
                                                <button onClick={() => handleDeleteRow(idx)} className="w-full h-12 text-gray-200 hover:text-red-500 font-black text-xl">×</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminImport;
