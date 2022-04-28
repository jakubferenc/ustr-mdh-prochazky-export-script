import { readFile, writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';


let formattedData = {};

const checkArrayAllType = (arr, type) => {

    return arr.every(i => (typeof i === type) );

};

const jsonToCsvTransformer = (json) => {

    let header = [];

    const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here


    Object.keys(json).forEach((key) => {

        header = [...header, ...Object.keys(json[key])];

    });

    header = Array.from(new Set(header)).sort();

    const csv = [
      header.join(','), // header row first
      ...Object.keys(json).map(key => header.map(fieldName => JSON.stringify(json[key][fieldName], replacer)).join(','))
    ].join('\r\n')

    return csv;

};

const securityTokenForFiles = '6f70a356-2195-4a13-ab02-0e36f07a9c23';
const isAddSecurityTokenToImageURL = true;

const exportFolderPath = './export';
const importFolderPath = './data';


const filesToExport = [
    'objekty-1651145667.json',
    'objekty-mdh-prochazka-budejovice-2021-12-1651153743.json'
];

const exportJsonFile = async (filePath) => {


    const jsonData = JSON.parse(
        await readFile(
          new URL(filePath, import.meta.url)
        )
      );
      
      const projectId = jsonData.meta.projectId;
      const resourcePath = jsonData.meta.resourcePath;
      
      Object.keys(jsonData.data).forEach((key) => {
      
          let flattenImagesObject = {};
      
      
          if (Array.isArray(jsonData.data[key].obrazky) && jsonData.data[key].obrazky.length > 0) {
      
              // do flattening of images object
      
              jsonData.data[key].obrazky.forEach((imgItem) => {
      
                  if (!imgItem.items) return; // the item doesn't have ".items" property, return
      
                  imgItem.items.forEach((imgItemImage) => {
      
                      flattenImagesObject[`${imgItemImage.id}_obrazek`] = (isAddSecurityTokenToImageURL) ? `${imgItemImage.realURL}&token=${securityTokenForFiles}` : imgItemImage.realURL;
                      flattenImagesObject[`${imgItemImage.id}_obrazek_mensi`] = (isAddSecurityTokenToImageURL) ? `${imgItemImage.realURLThumb}&token=${securityTokenForFiles}` : imgItemImage.realURLThumb;
      
          
                  });
          
              });
      
      
          }
      
      
          formattedData[key] = {
      
              _prochazkaId: `${projectId} - ${resourcePath}`,
              _id: jsonData.data[key].id,
              _uzivatelske_jmeno: jsonData.data[key].uzivatelske_jmeno,
              _casova_znacka: jsonData.data[key].timestamp,
              ...jsonData.data[key].dataProchazka, // data from prochazka transform to a column per slide asnwer
              ...flattenImagesObject,
      
          };
      
          // arrays to string
      
          Object.keys(formattedData[key]).forEach((questionKey) => {
      
      
              const value = formattedData[key][questionKey];
      
              if (Array.isArray(value)) {
      
                  if (checkArrayAllType(value, 'string')) {
                      // it's an array of all strings
      
                      formattedData[key][questionKey] = value.join('; ');
      
                  } else {
      
      
                      // it's an array of objects, we dont need that
                      delete formattedData[key][questionKey];
      
                  }
      
              
      
              }
      
      
          });
      
      });
      
      try {

         if (!existsSync(exportFolderPath)) mkdirSync(exportFolderPath);
      
          await writeFile(`${exportFolderPath}/export-${projectId}-${resourcePath}.json`, JSON.stringify(formattedData), {
      
              encoding: "utf8",
              flag: "w",
              mode: 0o666
      
          });

          const csvPreparedToExport = jsonToCsvTransformer(formattedData);


          await writeFile(`${exportFolderPath}/export-${projectId}-${resourcePath}.csv`, csvPreparedToExport, {
      
            encoding: "utf8",
            flag: "w",
            mode: 0o666
    
          });


      
      } catch (err) {
          console.log(err);
      }
    


};

filesToExport.forEach(async (filePath) => {

    await exportJsonFile(`${importFolderPath}/${filePath}`);

});


