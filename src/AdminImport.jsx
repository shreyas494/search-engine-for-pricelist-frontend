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
        console.log("📍 Frontend using API_URL:", API_URL);
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
        setStatus("Processing PDF... (using OCR if needed)");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/admin/parse-pdf`, {
                method: "POST",
                body: formData,
            });

            const responseText = await res.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error("Invalid server response. Please try again.");
            }

            if (!res.ok) {
                throw new Error(data.error || "Failed to parse PDF");
            }

            const { extractedData, rawText: text } = data;
            setRawText(text || "");

            if (Array.isArray(extractedData) && extractedData.length > 0) {
                setParsedData(extractedData);
                setStatus(`Found ${extractedData.length} items. Please review in the grid below.`);
            } else {
                setParsedData([]);
                setStatus("AI could not extract rows automatically. Please use the Reference Text on the left to fill the grid manually.");
            }
        } catch (error) {
            console.error(error);
            setStatus(`Note: ${error.message}. You can still add data manually.`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setParsedData([
            { brand: "", model: "", type: "", dp: null, mrp: null },
            ...parsedData,
        ]);
        setStatus("Manual row added.");
    };

    const handleDataChange = (index, field, value) => {
        const newData = [...parsedData];
        newData[index][field] = value;
        setParsedData(newData);
    };

    const handleDeleteRow = (index) => {
        const newData = parsedData.filter((_, i) => i !== index);
        setParsedData(newData);
    };

    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to clear all data?")) {
            setParsedData([]);
            setStatus("");
            setRawText("");
        }
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
                alert("SUCCESS! Data saved to Database. 🚀");
                setParsedData([]);
                setFile(null);
                setRawText("");
                setStatus("Import Complete.");
            } else {
                alert("Failed to save data. Please check your network.");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving data.");
        } finally {
            setImporting(false);
        }
    };

    const downloadCSV = () => {
        if (parsedData.length === 0) return;
        const headers = ["brand", "model", "type", "dp", "mrp"];
        const csvContent = [
            headers.join(","),
            ...parsedData.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || "")).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `pricelist_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadJSON = () => {
        if (parsedData.length === 0) return;
        const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `pricelist_export_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePaste = () => {
        const input = prompt("Paste data here (Tab or Comma separated rows). Columns: Brand, Model, Type, DP, MRP");
        if (!input) return;

        const lines = input.split("\n");
        const newItems = lines.map(line => {
            const parts = line.split(/[,\t]/);
            return {
                brand: parts[0]?.trim() || "",
                model: parts[1]?.trim() || "",
                type: parts[2]?.trim() || "",
                dp: parseFloat(parts[3]?.replace(/[^0-9.]/g, "")) || 0,
                mrp: parseFloat(parts[4]?.replace(/[^0-9.]/g, "")) || 0,
            };
        }).filter(item => item.brand || item.model);

        if (newItems.length > 0) {
            setParsedData([...newItems, ...parsedData]);
            setStatus(`Pasted ${newItems.length} items from text.`);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 sm:p-8 font-sans bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start flex-wrap gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Admin <span className="text-blue-600">Pricelist Hub</span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Extract, Review, and Save to Database with Zero Blockers.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition font-bold uppercase text-xs tracking-widest"
                    >
                        Clear Everything
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || parsedData.length === 0}
                        className={`px-8 py-3 rounded-xl font-black text-white shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 ${importing || parsedData.length === 0 ? "bg-gray-300 pointer-events-none" : "bg-green-600 hover:bg-green-700 shadow-green-200"}`}
                    >
                        {importing ? "SAVING..." : "🚀 SAVE TO DATABASE"}
                    </button>
                </div>
            </div>

            {/* Step 1: Upload & Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Source PDF</label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleParse}
                            disabled={!file || loading}
                            className={`px-8 py-3 rounded-xl text-white font-black transition-all flex items-center gap-2 shadow-lg ${loading ? "bg-gray-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100 active:translate-y-1"
                                }`}
                        >
                            {loading ? "⏳ PROCESSING..." : "SCAN & EXTRACT"}
                        </button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-around gap-2">
                    <button onClick={handleAddRow} className="flex flex-col items-center gap-1 group">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition">➕</div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">ADD ROW</span>
                    </button>
                    <button onClick={handlePaste} className="flex flex-col items-center gap-1 group">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition">📋</div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">PASTE TEXT</span>
                    </button>
                    <div className="h-10 w-px bg-gray-100 mx-2"></div>
                    <button onClick={downloadCSV} className="flex flex-col items-center gap-1 group">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition">📥</div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">CSV</span>
                    </button>
                </div>
            </div>

            {status && (
                <div className="mb-8 p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-sm font-bold animate-pulse inline-block px-10">
                    📢 {status}
                </div>
            )}

            {/* Step 2: Reference & Spreadsheet Side-by-Side */}
            <div className={`grid grid-cols-1 ${rawText ? 'lg:grid-cols-12' : ''} gap-8 h-full`}>

                {/* Reference Area */}
                {rawText && (
                    <div className="lg:col-span-4 h-full flex flex-col">
                        <div className="sticky top-8 flex flex-col h-[70vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800">
                            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-black text-[10px] text-gray-400 tracking-[0.2em] uppercase">
                                    Reference Data Console
                                </h3>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-900 overflow-auto font-mono text-[10px] leading-6 text-green-400 scrollbar-hide flex-grow select-all">
                                {rawText}
                            </div>
                        </div>
                    </div>
                )}

                {/* Spreadsheet Area */}
                <div className={`${rawText ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col`}>
                    <div className="bg-white border-2 border-gray-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
                        <div className="bg-gray-100 p-4 border-b border-gray-200 px-6 flex justify-between items-center">
                            <h2 className="text-sm font-black text-gray-700 flex items-center gap-3">
                                <span className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">📊</span>
                                INTERACTIVE SPREADSHEET GRID
                            </h2>
                            <span className="text-[10px] font-bold text-gray-400">{parsedData.length} ROWS IN MEMORY</span>
                        </div>

                        <div className="overflow-auto flex-grow spreadsheet-container relative">
                            <table className="w-full border-collapse text-xs table-fixed min-w-[1000px]">
                                <thead className="sticky top-0 z-20 shadow-sm border-b-2 border-gray-200">
                                    <tr className="bg-gray-50 uppercase tracking-tighter text-gray-400 font-black h-12">
                                        <th className="w-12 text-center border-r border-gray-200">#</th>
                                        <th className="w-[15%] px-4 text-left border-r border-gray-200">Brand</th>
                                        <th className="w-[40%] px-4 text-left border-r border-gray-200">Model / Pattern Name</th>
                                        <th className="w-[15%] px-4 text-left border-r border-gray-200">Type</th>
                                        <th className="w-[15%] px-4 text-right border-r border-gray-200">Dealer ₹</th>
                                        <th className="w-[15%] px-4 text-right border-r border-gray-200">MRP ₹</th>
                                        <th className="w-12 text-center">DEL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-40 text-center">
                                                <div className="flex flex-col items-center opacity-20">
                                                    <div className="text-8xl mb-4">📭</div>
                                                    <p className="text-xl font-black">GRID IS EMPTY</p>
                                                    <p className="text-sm">Scan a PDF or Paste Data to populate</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        parsedData.map((item, index) => (
                                            <tr key={index} className="group border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                                                <td className="text-center font-bold text-gray-300 bg-gray-50/30 border-r border-gray-200">{index + 1}</td>
                                                <td className="p-0 border-r border-gray-200 h-11">
                                                    <input
                                                        value={item.brand || ""}
                                                        onChange={(e) => handleDataChange(index, "brand", e.target.value)}
                                                        className="w-full h-full px-4 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all font-bold text-gray-700 capitalize"
                                                        placeholder="Brand..."
                                                    />
                                                </td>
                                                <td className="p-0 border-r border-gray-200">
                                                    <input
                                                        value={item.model || ""}
                                                        onChange={(e) => handleDataChange(index, "model", e.target.value)}
                                                        className="w-full h-full px-4 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all font-medium text-gray-600"
                                                        placeholder="e.g. CZAR A/T"
                                                    />
                                                </td>
                                                <td className="p-0 border-r border-gray-200">
                                                    <input
                                                        value={item.type || ""}
                                                        onChange={(e) => handleDataChange(index, "type", e.target.value)}
                                                        className="w-full h-full px-4 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all text-gray-400 italic"
                                                        placeholder="Tubeless..."
                                                    />
                                                </td>
                                                <td className="p-0 border-r border-gray-200">
                                                    <input
                                                        type="number"
                                                        value={item.dp || ""}
                                                        onChange={(e) => handleDataChange(index, "dp", e.target.value)}
                                                        className="w-full h-full px-4 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all text-right font-black text-gray-800"
                                                    />
                                                </td>
                                                <td className="p-0 border-r border-gray-200">
                                                    <input
                                                        type="number"
                                                        value={item.mrp || ""}
                                                        onChange={(e) => handleDataChange(index, "mrp", e.target.value)}
                                                        className="w-full h-full px-4 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none transition-all text-right font-black text-blue-600"
                                                    />
                                                </td>
                                                <td className="p-0 text-center group-hover:bg-red-50 transition-colors">
                                                    <button onClick={() => handleDeleteRow(index)} className="w-full h-full text-gray-200 group-hover:text-red-500 font-bold">×</button>
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
        </div>
    );
};

export default AdminImport;
