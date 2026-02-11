import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminImport = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [status, setStatus] = useState("");

    const handleFileChange = (e) => {
        console.log("📍 Frontend using API_URL:", API_URL);
        setFile(e.target.files[0]);
        setStatus("");
    };

    const handleParse = async () => {
        if (!file) {
            alert("Please select a PDF file first");
            return;
        }

        setLoading(true);
        setStatus("Scanning PDF... This may take a few seconds.");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/admin/parse-pdf`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to parse PDF");
            }

            const data = await res.json();
            if (Array.isArray(data)) {
                setParsedData(data);
                setStatus(`Successfully extracted ${data.length} items. Please review below.`);
            } else {
                setStatus("AI returned unexpected format. Try again.");
            }
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setParsedData([
            { brand: "", model: "", type: "", dp: null, mrp: null },
            ...parsedData,
        ]);
        setStatus("New row added. Fill in the details manually.");
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
        if (window.confirm("Are you sure you want to clear all extracted data?")) {
            setParsedData([]);
            setStatus("");
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
                alert("Data successfully imported to Database! 🚀");
                setParsedData([]);
                setFile(null);
                setStatus("Import Complete.");
            } else {
                alert("Failed to import data.");
            }
        } catch (error) {
            console.error(error);
            alert("Error importing data.");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin: PDF Pricelist Importer</h1>

            {/* Upload Section */}
            <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="mb-4 text-lg"
                />
                <button
                    onClick={handleParse}
                    disabled={!file || loading}
                    className={`px-6 py-2 rounded-lg text-white font-semibold transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                >
                    {loading ? "Scanning with AI..." : "Scan & Extract Data"}
                </button>
                {status && <p className="mt-4 text-gray-600">{status}</p>}
            </div>

            {/* Review Section */}
            {parsedData.length > 0 && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Review Extracted Data ({parsedData.length})</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddRow}
                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
                            >
                                + Add Manually
                            </button>
                            <button
                                onClick={handleClearAll}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg"
                            >
                                {importing ? "Importing..." : "Approve & Save to Database"}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3">Brand</th>
                                    <th className="px-4 py-3">Model</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Dealer Price</th>
                                    <th className="px-4 py-3">MRP</th>
                                    <th className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        {["brand", "model", "type", "dp", "mrp"].map((field) => (
                                            <td key={field} className="px-2 py-2">
                                                <input
                                                    type={field === "dp" || field === "mrp" ? "number" : "text"}
                                                    value={item[field] || ""}
                                                    onChange={(e) => handleDataChange(index, field, e.target.value)}
                                                    className="w-full p-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={() => handleDeleteRow(index)}
                                                className="text-red-500 hover:text-red-700 font-bold"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminImport;
