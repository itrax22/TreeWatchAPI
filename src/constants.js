const constants = {
    RECHOVOT_SITE_URL: 'https://www.rehovot.muni.il/429/',
    RECHOVOT_BASE_URL: 'https://www.rehovot.muni.il',
    RECHOVOT_BATCH_SIZE: 20,
    RECHOVOT_OUTPUT_DIR: './output',
    RECHOVOT_TEMP_DIR: './temp',
    PETAH_TIKVA_SITE_URL: 'https://www.petah-tikva.muni.il/Transparency/ForestOfficer/Pages/Licenses.aspx',
    PETAH_TIKVA_BASE_URL: 'https://www.petah-tikva.muni.il',
    PETAH_TIKVA_OUTPUT_DIR: './output/petah_tikva',
    PETAH_TIKVA_TEMP_DIR: './temp/petah_tikva',
    PETAH_TIKVA_BATCH_SIZE: 10,
    RISHON_SITE_URL: 'https://www.rishonlezion.muni.il/Residents/Environment/UrbanNature/Pages/default.aspx',
    RISHON_BASE_URL: 'https://www.rishonlezion.muni.il',
    RISHON_OUTPUT_DIR: './data/rishon',
    RISHON_TEMP_DIR: './tmp/rishon',
    RISHON_BATCH_SIZE: 5,
    GIVATAYIM_SITE_URL: 'https://www.givatayim.muni.il/93/',
    GIVATAYIM_BASE_URL: 'https://www.givatayim.muni.il',
    GIVATAYIM_OUTPUT_DIR: './output/givatayim',
    GIVATAYIM_TEMP_DIR: './temp/givatayim',
    GIVATAYIM_BATCH_SIZE: 5,
    ASHDOD_SITE_URL: 'https://www.ashdod.muni.il/he-il/%D7%90%D7%AA%D7%A8-%D7%94%D7%A2%D7%99%D7%A8/%D7%AA%D7%A4%D7%A2%D7%95%D7%9C/%D7%A4%D7%A7%D7%99%D7%93-%D7%99%D7%A2%D7%A8%D7%95%D7%AA-%D7%A2%D7%99%D7%A8%D7%95%D7%A0%D7%99-%D7%A8%D7%90%D7%A9%D7%99/%D7%A4%D7%A7%D7%99%D7%93-%D7%94%D7%99%D7%A2%D7%A8%D7%95%D7%AA-%D7%94%D7%A2%D7%99%D7%A8%D7%95%D7%A0%D7%99/%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%A0%D7%95%D7%AA-%D7%9C%D7%91%D7%99%D7%A6%D7%95%D7%A2-%D7%9B%D7%A8%D7%99%D7%AA%D7%94-%D7%94%D7%A2%D7%AA%D7%A7%D7%94/%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%A0%D7%95%D7%AA-%D7%A4%D7%A7%D7%99%D7%93-%D7%99%D7%A2%D7%A8%D7%95%D7%AA',
    ASHDOD_BASE_URL: 'https://www.ashdod.muni.il',
    ASHDOD_OUTPUT_DIR: './output/ashdod',
    ASHDOD_TEMP_DIR: './temp/ashdod',
    ASHDOD_BATCH_SIZE: 5,
    NETANYA_EXCEL_URL: 'https://www.netanya.muni.il/Documents/%D7%98%D7%A4%D7%A1%D7%99%D7%9D%20%D7%A9%D7%99%D7%9E%D7%95%D7%A9%D7%99%D7%99%D7%9D/%D7%90%D7%99%D7%9B%D7%95%D7%AA%20%D7%94%D7%A1%D7%91%D7%99%D7%91%D7%94/MAAKAV1.xlsx',
    NETANYA_OUTPUT_DIR: './output/netanya',
    NETANYA_TEMP_DIR: './temp/netanya',
    NETANYA_BATCH_SIZE: 10,
    QUERY_CONSTANTS : {
        MAX_PAGE_SIZE: 50,
        DEFAULT_PAGE: 1,
        DEFAULT_PAGE_SIZE: 20,
        DEFAULT_SORT_FIELD: 'licenseDate',
        VALID_SORT_FIELDS: [
            'createDate',
            'licenseType',
            'licenseDate',
            'lastDateToObject',
            'settlementName',
            'reason'
        ]    
    }
};

module.exports = {constants};