import pandas as pd
import numpy as np
import os
import re
import urllib
from urllib import *
from configparser import SafeConfigParser
from bs4 import BeautifulSoup

// processURL: Takes URL input, checks if URL is of expected format, adds query string if none detected and
// modifies pageSize parameter from query string if it is absent or not set to max (500 results per page).
// Returns dict with processed URL, mode (search or detail page) and the netloc (ie www.digikey.com)

def processURL(name, URL):

	pURL = urllib.parse.urlparse(URL)

	if not ((pURL.scheme == 'https') or (pURL.scheme == 'http')):
		if pURL.scheme == '':
			URL = 'http://' + URL
		else:
			raise Exception("invalid URL for" +  str(name))

	if not re.match("www.digikey." , pURL.netloc, re.IGNORECASE):
		raise Exception("invalid URL for" +  str(name))

	if re.match("/product-detail", pURL.path, re.IGNORECASE):
		mode = 'detail'

	elif re.match("/product-search", pURL.path, re.IGNORECASE):
		mode = 'search'
		if pURL.query == '':
			URL = URL + "?mnonly=0&newproducts=0&ColumnSort=0&page=1&stock=0&pbfree=0&rohs=0&k=&quantity=&ptm=0&fid=0&pageSize=500"
		elif re.search('&pageSize', pURL.query):
			re.sub(r"pageSize=[0-9]+","pageSize=500", URL)
		else:
			URL = URL + "&pageSize=500"

	else:
		raise Exception("invalid URL for" +  str(name))

	return {"URL": URL,"Mode": mode, "netloc": pURL.netloc}

def requestURL(name, URL):

	try:
		print("Downloading: " + str(URL))
		return urllib.request.urlopen(str(URL))

	except urllib.error.HTTPError as e:
		print(e.code)
		raise Exception("HTML Dowload Failed:" + URL)

# retrieveData: If in detail mode, part info is retrieved along with the info for each packaging version
# listed on the page; results stored in CSV. If in search mode, all unique manufacturer part numbers (manID)
# are extracted from search results; data is retrieved for all packaging variants of each unique manID;
# data for all parts in that search are stored in a single CSV
def retrieveData(name, pURL, config, columns):

	URL = pURL["URL"]
	soup = BeautifulSoup(requestURL(name, URL), 'html.parser')
	cur = soup.find("a", {"class": "header-currency"}).text.strip()
	df = pd.DataFrame(columns=columns)

	#ensure Currency used is consistent. set in Config file.
	if config.getboolean('Retrieve Digikey Data', 'currency-check'):
		if not cur == str(config.get('Retrieve Digikey Data', 'currency')):
			raise Exception("currency mismatch")

	if (pURL["Mode"] == 'detail') or soup.find("div", {"class": "product-top-section"}):
		df = pd.concat([df, retrievePartDetails(name, soup, cur, config) ], axis=0,ignore_index=True)
		for i in soup.find_all("td", {"class": "lnkAltPack"}):
			try:
				URL = "http://" + pURL['netloc'] + i.find("a").get("href")
				soup = BeautifulSoup(requestURL(name, URL), 'html.parser')
				df = pd.concat([df, retrievePartDetails(name, soup, cur, config) ], axis=0,ignore_index=True)
			except Exception as e:
				print(e)
				print("Skipped: " + URL)

	elif pURL["Mode"] == 'search':

		pages = int(re.sub(r".*/","",soup.find("span", {"class": "current-page"}).contents[0]))
		dURL = re.sub("product-search/","product-search/download.csv?",URL)
		urllib.request.urlretrieve(dURL, "DigiKeyData/tmp/" + str(name) + "-1.csv")
		tdf = pd.read_csv("DigiKeyData/tmp/" + str(name) + "-1.csv")["Manufacturer Part Number"]

		for i in range(2, pages):
			dURL = re.sub(r"page=[0-9]+", "page=" + str(i), dURL)
			print(dURL)
			urllib.request.urlretrieve(dURL, "DigiKeyData/tmp/" + str(name) + "-" + str(i) + ".csv")
			tdf = pd.concat([tdf, pd.read_csv("DigiKeyData/tmp/" + str(name) + "-" + str(i) + ".csv")["Manufacturer Part Number"]], axis=0,ignore_index=True)
			os.remove("DigiKeyData/tmp/" + str(name) + "-" + str(i) + ".csv")

		tdf = tdf.drop_duplicates().reset_index()["Manufacturer Part Number"]

		for i in range(0, len(tdf)):
			try:
				manID = tdf.iloc[i]
				URL = "http://" + pURL["netloc"] + "/product-search/" + "en" + "?keywords=" + str(manID) + "&pageSize=500"
				soup = BeautifulSoup(requestURL(name, URL), 'html.parser')

				if soup.find("div", {"class": "product-top-section"}):
					df = pd.concat([df, retrievePartDetails(name, soup, cur, config) ], axis=0,ignore_index=True)
				else:
					for i in soup.find_all("tr", {"itemtype": "http://schema.org/Product"}):
						try:
							URL = "http://" + pURL['netloc'] + i.find("td", {"class": "tr-dkPartNumber lnkPart nowrap-culture"}).find("a").get("href")
							tempSoup = BeautifulSoup(requestURL(name, URL), 'html.parser')
							df = pd.concat([df, retrievePartDetails(name, tempSoup, cur, config) ], axis=0,ignore_index=True)
						except Exception as e:
							print(e)
							print("Skipped: " + URL)

			except Exception as e:
				print(e)
				print("Skipped: " + URL)

		df = df.drop_duplicates().reset_index()

	df = df.dropna(axis='columns',how="all")
	df.to_csv("DigiKeyData/" + str(name) + ".csv" ,index=False)

# retrievePartDetails: the part details are scraped from part-detail page, a dataframe is returned with said information.
def retrievePartDetails(name, soup, cur, config):

	sep = str(config.get('Retrieve Digikey Data', 'dot-comma'))

	if sep == ',':
		dec = '.'
	if sep == '.':
		dec = ','

	manID = soup.find("meta", {"itemprop": "name"}).get("content")
	partID = re.sub("sku:", "", soup.find("meta", {"itemprop": "productID"}).get("content"))
	datasheet = soup.find("a", {"class": "lnkDatasheet"}).get('href')
	quantityAvail = re.sub(r".*:", "", soup.find("td", {"id": "quantityAvailable"}).contents[2].strip())

	if soup.find("p", {"class": "alert"}):
		feeStr = re.search(r"[0-9\.\,]+", soup.find("p", {"class": "alert"}).text.strip()).group(0)
		fee = float(feeStr.replace(dec,'.'))
	else:
		fee = 0

	d = {'Digi-Key Part Number': partID, 'Manufacturer Part Number': manID, 'Datasheet': datasheet, 'Quantity Available': quantityAvail, 'Currency': cur, 'Fee': fee}
	prices = []
	priceBreaks = []
	priceBreaksQ = []

	try:
		for i in soup.find("table", {"id": "product-dollars"}).find_all("td"):
			if i.contents[0] == 'Call':
				raise ValueError(name + ": " + partID + ": Call for price detected - part skipped")
			prices.append(i.contents[0].replace(sep,''))

		for i in range(0, len(prices), 3):
			priceBreaks.append(float(prices[i+1].replace(dec,'.')))
			priceBreaksQ.append(int(prices[i]))

		for i in range(1, len(priceBreaks)):
			d['Price Break'+str(i)] = priceBreaks[i - 1]
			d['Price Break Q'+str(i)] = priceBreaksQ[i - 1]

		d['Minimum Quantity'] = priceBreaksQ[0]

	except ValueError as e:
		print(e)

	return pd.DataFrame(d, index=np.arange(1))

def main():

	# loading configuration file
	config = SafeConfigParser()
	if config.read('config.ini') != ['config.ini']:
		raise OSError('no config.ini file present')

	# loading CSV file
	try:
		pdf = pd.read_csv("DataIN/DigiKeyParts.csv")
		print("Loaded Part List")
	except OSError as e:
		print(e)
		exit()

	if len(pdf) == 0:
		print("No parts listed in CSV file")
		exit()

	columns = ['Digi-Key Part Number', 'Manufacturer Part Number', 'Datasheet', 'Quantity Available', 'Currency', 'Fee', 'Minimum Quantity']
	for i in range(1,10):
		columns.append('Price Break' + str(i))
		columns.append('Price Break Q' + str(i))

	# looping over parts list, retrieving DigiKey Data
	for i in range(0, len(pdf)):
		x = pdf.iloc[i].values
		print("attempting retrieval of: " + str(x[0]))
		try:
			retrieveData(x[0], processURL(x[0], x[1]), config, columns)
		except Exception as e:
			print("Part: " + str(x[0]) + " Retrieval Failed")
			print(e)


if __name__ == '__main__':
	main()
