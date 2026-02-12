import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminImport = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [rawText, setRawText] = useState("");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [status, setStatus] = useState("");

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
        setStatus("⌛ Scanning PDF... Please wait.");

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
                setStatus(`✅ Found ${extractedData.length} items. You can now edit them below.`);
            } else {
                setParsedData([{ brand: "NEW", model: "Empty Row", type: "", dp: 0, mrp: 0 }]);
                setStatus("⚠️ AI could not format data. Please use 'Add Row' or paste data below.");
            }
        } catch (error) {
            console.error(error);
            setStatus(`❌ Error: ${error.message}. You can still add data manually.`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setParsedData([{ brand: "", model: "", type: "", dp: 0, mrp: 0 }, ...parsedData]);
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
        try {
            const res = await fetch(`${API_URL}/api/admin/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedData),
            });

            if (res.ok) {
                alert("SUCCESS! All data saved to Database.");
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
        const headers = ["brand", "model", "type", "dp", "mrp"];
        const csv = [headers.join(","), ...parsedData.map(r => headers.map(f => JSON.stringify(r[f] || "")).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pricelist.csv";
        a.click();
    };

    return (
        <div className="min-h-screen bg-white p-4 md:p-10 font-sans">
            <div className="max-w-[1400px] mx-auto">
                <header className="flex justify-between items-center mb-10 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">PRICELIST <span className="text-blue-600">EDITOR</span></h1>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mt-1">Direct Spreadsheet Interface</p>
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

                {/* Upload & Controls */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                    <div className="flex-1 w-full text-left">
                        <span className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Step 1: Upload PDF</span>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                    <button
                        onClick={handleParse}
                        disabled={!file || loading}
                        className="px-10 py-4 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "SCANNING..." : "SCAN PDF"}
                    </button>
                    <div className="h-10 w-px bg-gray-200 hidden md:block"></div>
                    <div className="flex gap-2">
                        <button onClick={handleAddRow} className="px-5 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-50 transition shadow-sm">+ ADD ROW</button>
                        <button onClick={downloadCSV} className="px-5 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-50 transition shadow-sm">📥 CSV</button>
                    </div>
                </div>

                {status && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-sm font-bold flex items-center gap-3">
                        <span className="p-1 bg-blue-600 text-white rounded-md text-[10px]">INFO</span>
                        {status}
                    </div>
                )}

                {/* Main Spreadsheet Grid */}
                <div className="bg-white border-2 border-gray-200 rounded-3xl overflow-hidden shadow-2xl transition-all">
                    <div className="bg-gray-100 p-4 px-6 border-b flex justify-between items-center">
                        <h2 className="text-xs font-black text-gray-500 tracking-widest uppercase">Spreadsheet Form</h2>
                        {rawText && (
                            <details className="text-[10px] font-bold text-blue-600 cursor-pointer">
                                <summary>VIEW RAW PDF TEXT (REFERENCE)</summary>
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
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3 border-l w-48">Brand</th>
                                    <th className="p-3 border-l">Model / Pattern</th>
                                    <th className="p-3 border-l w-32">Type</th>
                                    <th className="p-3 border-l w-32 text-right">DP (₹)</th>
                                    <th className="p-3 border-l w-32 text-right">MRP (₹)</th>
                                    <th className="p-3 border-l w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center text-gray-300 font-bold uppercase text-xs tracking-widest">
                                            The grid is empty. Please upload a PDF to begin.
                                        </td>
                                    </tr>
                                ) : (
                                    parsedData.map((row, idx) => (
                                        <tr key={idx} className="border-b last:border-0 hover:bg-blue-50/50 transition">
                                            <td className="p-3 text-center text-gray-300 font-bold text-[10px]">{idx + 1}</td>
                                            <td className="p-0 border-l">
                                                <input
                                                    value={row.brand}
                                                    onChange={e => handleDataChange(idx, "brand", e.target.value)}
                                                    className="w-full h-12 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent font-bold capitalize"
                                                    placeholder="BRAND"
                                                />
                                            </td>
                                            <td className="p-0 border-l">
                                                <input
                                                    value={row.model}
                                                    onChange={e => handleDataChange(idx, "model", e.target.value)}
                                                    className="w-full h-12 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent"
                                                    placeholder="MODEL NAME"
                                                />
                                            </td>
                                            <td className="p-0 border-l">
                                                <input
                                                    value={row.type}
                                                    onChange={e => handleDataChange(idx, "type", e.target.value)}
                                                    className="w-full h-12 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent text-gray-400 italic"
                                                    placeholder="TYPE"
                                                />
                                            </td>
                                            <td className="p-0 border-l">
                                                <input
                                                    type="number"
                                                    value={row.dp}
                                                    onChange={e => handleDataChange(idx, "dp", e.target.value)}
                                                    className="w-full h-12 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent text-right font-black"
                                                />
                                            </td>
                                            <td className="p-0 border-l">
                                                <input
                                                    type="number"
                                                    value={row.mrp}
                                                    onChange={e => handleDataChange(idx, "mrp", e.target.value)}
                                                    className="w-full h-12 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent text-right font-black text-blue-600"
                                                />
                                            </td>
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
