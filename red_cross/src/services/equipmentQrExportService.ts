import { Alert } from 'react-native';

import { EquipmentStock, EquipmentType } from '@/models/Equipment';
import { getAllEquipmentStocks } from '@/services/equipmentStockService';
import { getAllEquipmentTypes } from '@/services/equipmentTypeService';
import {
  buildEquipmentQrPdfHtml,
  EquipmentQrPdfItem,
} from '@/utils/equipmentQrPdfTemplate';

export async function exportEquipmentQrCodesPdf(): Promise<void> {
  try {
    const Print = require('expo-print');
    const Sharing = require('expo-sharing');
    const QRCodeCore = require('qrcode/lib/core/qrcode');
    const QRCodeSvgRenderer = require('qrcode/lib/renderer/svg-tag');

    const [equipmentTypes, equipmentStocks] = await Promise.all([
      getAllEquipmentTypes(),
      getAllEquipmentStocks(),
    ]);

    if (equipmentStocks.length === 0) {
      Alert.alert('Nema podataka', 'Trenutno nema lager stavki za izvoz.');
      return;
    }

    const pdfItems = await buildPdfItems(
      equipmentTypes,
      equipmentStocks,
      QRCodeCore,
      QRCodeSvgRenderer
    );
    const html = buildEquipmentQrPdfHtml(pdfItems);
    const file = await Print.printToFileAsync({
      html,
      width: 794,
      height: 1123,
      margins: {
        left: 24,
        right: 24,
        top: 24,
        bottom: 24,
      },
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (!isSharingAvailable) {
      Alert.alert('PDF je generisan', `Fajl je sacuvan na putanji:\n${file.uri}`);
      return;
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'PDF kodovi opreme',
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Error exporting equipment QR codes PDF:', error);

    Alert.alert(
      'Greska',
      'Za izvoz PDF kodova potrebno je da budu dostupni expo-print i expo-sharing moduli.'
    );
  }
}

async function buildPdfItems(
  equipmentTypes: EquipmentType[],
  equipmentStocks: EquipmentStock[],
  QRCodeCoreModule: {
    create: (value: string, options?: Record<string, unknown>) => unknown;
  },
  QRCodeSvgRendererModule: {
    render: (
      qrData: unknown,
      options?: Record<string, unknown>,
      cb?: ((error: Error | null, svgTag: string) => void) | undefined
    ) => string;
  }
): Promise<EquipmentQrPdfItem[]> {
  const equipmentTypeMap = equipmentTypes.reduce<Record<string, EquipmentType>>(
    (result, equipmentType) => {
      result[equipmentType.id] = equipmentType;
      return result;
    },
    {}
  );

  const sortedStocks = [...equipmentStocks].sort((first, second) => {
    const firstTypeName =
      equipmentTypeMap[first.equipmentTypeId]?.name ?? first.equipmentTypeId;
    const secondTypeName =
      equipmentTypeMap[second.equipmentTypeId]?.name ?? second.equipmentTypeId;

    const byType = firstTypeName.localeCompare(secondTypeName);

    if (byType !== 0) {
      return byType;
    }

    return (first.size ?? '').localeCompare(second.size ?? '');
  });

  return Promise.all(
    sortedStocks.map(async stock => {
      const equipmentType = equipmentTypeMap[stock.equipmentTypeId];
      const qrData = QRCodeCoreModule.create(stock.qrToken, {
        errorCorrectionLevel: 'M',
      });
      const qrSvgMarkup = QRCodeSvgRendererModule.render(qrData, {
        margin: 1,
        width: 220,
      });
      const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
        qrSvgMarkup
      )}`;

      return {
        id: stock.id,
        title: equipmentType?.name ?? stock.equipmentTypeId,
        size: stock.size,
        qrDataUrl,
      };
    })
  );
}
