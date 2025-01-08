
import React from "react";
import { useState, useEffect } from "react";

import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, TimeScale);



import {
    Accordion,
    AccordionPanel,
    AccordionItem,
    AccordionButton,
    AccordionIcon,
    Box,
    CloseButton,
    IconButton,
    Input,
    Text,
    Flex,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Tooltip as ChakraTooltip,
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Spinner,
    Stack,
    Divider,
    Center
} from "@chakra-ui/react";

import { useAuth0 } from "@auth0/auth0-react";
import { InfoOutlineIcon, TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons";
import { ChevronDownIcon } from "@chakra-ui/icons";

import { UserMetadata, type Entry } from "../models";
import axios from "axios";


type OwnedStocks = {
    [key: string]: number;
};

type DataPoint = {
    x: Date;
    y: number;
};

const CustomTooltip: React.FC<{ label: string }> = ({ label }) => {
    return (
        <ChakraTooltip label={label} fontSize="md">
            <InfoOutlineIcon color="purple.400" as="span" alignSelf="center" m={2} boxSize={4} />
        </ChakraTooltip>
    );
};


// define colors of stocks
const gradeColors: { [key: string]: string } = {
    "A": "green.400",
    "B": "yellow.400",
    "C": "orange.400",
    "D": "red.400",
    "F": "gray.400",
};


function Simvest() {
    const [userCash, setUserCash] = useState(0); // user's cash
    const [ownedStocks, setOwnedStocks] = useState<OwnedStocks>({}); // user's owned stocks
    const [userInvestmentData, setUserInvestmentData] = useState<DataPoint[]>([]); // user's investment graph
    const [investmentValue, setInvestmentValue] = useState(0); // user's investment value
    const [graphPeriod, setGraphPeriod] = useState(30) // graph time range

    const [isBuying, setIsBuying] = useState(true); // is user buying or selling?
    const [numOfShares, setNumOfShares] = useState<string>('0'); // number of shares
    const [valOfShares, setValOfShares] = useState<string>('0'); // value of shares

    const [minvestData, setMinvestData] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [stockPrices, setStockPrices] = useState<Array<number>>([]);
    const [stockDates, setStockDates] = useState<Array<string>>();
    const [chartMovingAverage, setChartMovingAverage] = useState<boolean>(false);
    const { user, loginWithRedirect } = useAuth0();

    let [userMetadata, setUserMetadata] = React.useState<UserMetadata>({
        investmentAmount: 1000,
        finalInvestmentAmount: 2000,
        investmentDuration: 12,
        riskLevel: "low",
        selectedStocks: [],
        placeholder: true,
    });



    const restrainData = (days: number) => {
        if (days === 0) {
            return userInvestmentData;
        }

        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        return userInvestmentData.filter((point) => new Date(point.x) >= startDate);
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: graphPeriod === 1 ? 'hour' : graphPeriod === 5 ? 'day' : 'week',
                },
                title: {
                    display: true,
                    text: 'Date',
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Portfolio Value',
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    const chartData = {
        datasets: [
            {
                data: restrainData(graphPeriod),
                fill: false,
                label: "Portfolio Value",
                backgroundColor: "rgba(255,255,255,1)",
                borderColor: "rgba(159,122,234,1)",
                borderCapStyle: "butt",
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: "miter",
                pointBorderColor: "rgba(229,198,70,1)",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "rgba(75,192,192,1)",
                pointHoverBorderColor: "rgba(225,225,225,1)",
                pointHoverBorderWidth: 2,
                pointRadius: 2,
                pointHitRadius: 10,
            },
        ],
    };



    const handleClick = (entry: Entry) => {
        setSelectedEntry(entry);
        setNumOfShares('0');
        setValOfShares('0');
        setIsBuying(true)
        setIsModalOpen(true);
        fetchStockPriceData(entry.Ticker);
    };

    const fetchStockPriceData = async (ticker: string) => {
        const stockPriceData = await axios.get(
            `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?apikey=[REDACTED]`
        );
        let prices: Float32List = [];
        let dates: Array<string> = [];

        for (let index = 0; index < 450; index++) {
            prices.push(stockPriceData.data.historical[index]?.adjClose);
            dates.push(stockPriceData.data.historical[index]?.date);
        }
        setStockPrices(prices.reverse());
        setStockDates(dates.reverse());
    };


    const fetchCurrentPrice = async (ticker: string) => {
        const stockPriceData = await axios.get(
            `https://financialmodelingprep.com/api/v3/quote-short/${ticker}?apikey=[REDACTED]`
        );

        return (stockPriceData.data[0].price)
    };

    const calculateMovingAverage = (arr: number[], windowSize: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < arr.length; i++) {
            const windowStart = Math.max(0, i - windowSize + 1);
            const windowEnd = i + 1;
            const windowValues = arr.slice(windowStart, windowEnd);
            const sum = windowValues.reduce((a, b) => a + b, 0);
            const average = sum / windowValues.length;
            result.push(average);
        }
        return result;
    }

    function analyzeSignal(
        prices: number[],
        ma50: number[],
        ma200: number[]
    ) {
        // Check if lengths of arrays are equal
        if (prices.length !== ma50.length || prices.length !== ma200.length) {
            console.error("Unequal lengths of arrays. Please ensure all arrays have the same size.");
            return "neutral";
        }
        // Loop through each day's data
        for (let i = 0; i < prices.length - 1; i++) {
            const price = prices[i];

            // Check for bullish signal (cross above MA and 50d MA > 200d MA)
            if (
                (price > ma50[i] && prices[i + 1] <= ma50[i + 1]) ||
                (price > ma200[i] && prices[i + 1] <= ma200[i + 1])
            ) {
                if (ma50[0] > ma200[0]) {
                    return "bullish signal";
                } else {
                    return "neutral";
                }
            }

            // Check for bearish signal (cross below MA and 50d MA < 200d MA)
            if (
                (price < ma50[i] && prices[i + 1] >= ma50[i + 1]) ||
                (price < ma200[i] && prices[i + 1] >= ma200[i + 1])
            ) {
                if (ma50[0] < ma200[0]) {

                    return "bearish signal";
                } else {
                    return "neutral";
                }
            }
        }

        // No signal found
        return "neutral";
    }

    const handleStockChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let val = event.target.value

        // if user trying to delete input, set values to 0
        if (event.target.value == "") {
            setValOfShares('0')
            setNumOfShares('0')
            return;
        }

        // don't alter user's input if it has a decimal or 0 at the end
        if (val.charAt(val.length - 1) == '.' || val.charAt(val.length - 1) == '0') {
            setNumOfShares(val)
            setValOfShares((Math.round(parseFloat(event.target.value) * selectedEntry!.Price * 100) / 100).toString());
            return;
        }

        // don't let user add non-number characters
        if (isNaN(parseInt(val.charAt(val.length - 1)))) {
            return;
        }

        // round number of shares + calculate value of shares
        setNumOfShares((Math.round(parseFloat(event.target.value) * 1000) / 1000).toString());
        setValOfShares((Math.round(parseFloat(event.target.value) * selectedEntry!.Price * 100) / 100).toString());
    }



    const handleDollarAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let val = event.target.value

        // if user tries to delete input, set values to 0
        if (event.target.value == "") {
            setValOfShares('0')
            setNumOfShares('0')
            return;
        }

        // don't alter user's input if it has a decimal or 0 at the end
        if (val.charAt(val.length - 1) == '.' || val.charAt(val.length - 1) == '0') {
            setValOfShares(val)
            setNumOfShares((Math.round((parseFloat(event.target.value) / selectedEntry!.Price) * 1000) / 1000).toString());
            return;
        }

        // don't let user add non-number characters
        if (isNaN(parseInt(val.charAt(val.length - 1)))) {
            return;
        }

        // round number of shares + calculate value of shares
        setValOfShares((Math.round(parseFloat(event.target.value) * 100) / 100).toString());
        setNumOfShares((Math.round((parseFloat(event.target.value) / selectedEntry!.Price) * 1000) / 1000).toString());
    }



    function handleOrder() {
        // if user is buying
        if (isBuying) {
            console.log("buying " + numOfShares + " shares of " + selectedEntry!.Ticker);

            // check if user has sufficient funds
            if (userCash < parseFloat(valOfShares) || parseFloat(numOfShares) == 0) {
                alert("Insufficient funds");
                return;
            }

            // then take user's money
            setUserCash(Math.round((userCash - parseFloat(valOfShares)) * 100) / 100);


            // add new stock if the stock has not been owned before
            const newOwnedStocks = { ...ownedStocks };

            if (!ownedStocks[selectedEntry!.Ticker]) {
                newOwnedStocks[selectedEntry!.Ticker] = parseFloat(numOfShares)
            } else {
                newOwnedStocks[selectedEntry!.Ticker] = Math.round((ownedStocks[selectedEntry!.Ticker] + parseFloat(numOfShares)) * 1000) / 1000
            }

            setOwnedStocks(newOwnedStocks);
        }


        // if user is selling
        else {
            console.log("selling " + numOfShares + " shares of " + selectedEntry!.Ticker);

            // check if user has sufficient shares
            if (!ownedStocks[selectedEntry!.Ticker] || ownedStocks[selectedEntry!.Ticker] < parseFloat(numOfShares) || parseFloat(numOfShares) == 0) {
                alert("Insufficient shares");
                return;
            }


            // then add to user's cash
            setUserCash(Math.round((userCash + parseFloat(valOfShares)) * 100) / 100);


            // then take user's stocks
            const newNumOfStocks = Math.round((ownedStocks[selectedEntry!.Ticker] - parseFloat(numOfShares)) * 1000) / 1000
            const newOwnedStocks = { ...ownedStocks };

            if (newNumOfStocks == 0) {
                delete newOwnedStocks[selectedEntry!.Ticker];
            } else {
                newOwnedStocks[selectedEntry!.Ticker] = newNumOfStocks;
            }

            setOwnedStocks(newOwnedStocks);

        }

        setNumOfShares("0")
        setValOfShares('0')
    }


    async function saveProgress() {

        try {
            // const response = await fetch("https://beta.minvestfinance.com:3001/simvest-update", {
            const response = await fetch("http://localhost:3001/simvest-update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user!.sub,
                    ownedStocks,
                    userCash,
                    userInvestmentData
                }),
            });

            if (response.ok) {
                console.log("----- DATA SAVED -----");
            } else {
                throw new Error("Failed to update profile");
            }

        } catch (error) {
            console.error("Error updating user metadata:", error);
        }
    }



    // save user's progress anytime userinvestmentdata updates
    // only need to update based on that variable since that changes anytime the stocks or cash change 
    useEffect(() => {
        console.log("----- SAVING DATA -----")
        console.log("owned stocks", ownedStocks);
        console.log("user cash", userCash);
        console.log("investment data", userInvestmentData);
        saveProgress();
    }, [userInvestmentData]);



    if (user == null) {
        loginWithRedirect();
        return;
    }


    async function fetchUserMetadata() {
        try {
            // const response = await fetch("https://beta.minvestfinance.com:3001/get-user-metadata", {
            const response = await fetch("http://localhost:3001/get-user-metadata", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user?.sub,
                }),
            });

            if (response.ok) {
                const data = await response.json();

                // data.userMetadata.userCash = 5000
                // data.userMetadata.ownedStocks = {}
                // data.userMetadata.investmentData = [ { x: '2024-10-01T10:20:00Z', y: 3050 },
                //     { x: '2024-10-02T10:20:00Z', y: 3055 },
                //     { x: '2024-10-03T10:20:00Z', y: 3060 },
                //     { x: '2024-10-04T10:20:00Z', y: 3070 },
                //     { x: '2024-10-05T10:20:00Z', y: 3065 },]

                if (!data.userMetadata.userCash && data.userMetadata.userCash != 0) {
                    data.userMetadata.userCash = 5000
                    console.log("cash was undefined, setting it to 5000...")
                }

                if (!data.userMetadata.ownedStocks) {
                    data.userMetadata.ownedStocks = {}
                    console.log("owned stocks was undefined, setting empty dictionary...")
                }

                if (!data.userMetadata.investmentData) {
                    data.userMetadata.investmentData = []
                    console.log("investment data was undefined, setting empty list...")
                }

                setUserCash(data.userMetadata.userCash);
                setOwnedStocks(data.userMetadata.ownedStocks);
                setUserInvestmentData(data.userMetadata.investmentData);
                setUserMetadata(data.userMetadata);
                console.log("user metadata fetched")
            } else {
                throw new Error("Failed to fetch user metadata");
            }

        } catch (error) {
            console.error("Error fetching user metadata:", error);
        }
        setIsLoadingMetadata(false)
    }



    async function fetchPersonalizedData() {

        const initialInvestment = userMetadata.investmentAmount.toString();
        const finalInvestment = userMetadata.finalInvestmentAmount.toString();
        const time = userMetadata.investmentDuration.toString();
        const risk = userMetadata.riskLevel;

        // const url = `https://beta.minvestfinance.com:105/personalized-data?initialInvestment=${initialInvestment}&finalInvestment=${finalInvestment}&time=${time}&risk=${risk}`;
        const url = `http://localhost:105/personalized-data?initialInvestment=${initialInvestment}&finalInvestment=${finalInvestment}&time=${time}&risk=${risk}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });


        if (response.ok) {
            const data = await response.json();
            setMinvestData(data);
            console.log("personalized data fetched")
            setIsLoadingData(false)
        } else {
            console.error("Error fetching personalized data:", response.statusText);
        }
    }

    // Fetch data using useEffect
    useEffect(() => {
        fetchUserMetadata();

        // wait 2 seconds before fetching stocks
        setTimeout(function () {
            fetchPersonalizedData();
        }, 2000);
    }, []);



    const [searchStock, setSearchStock] = useState("");
    const [searchTicker, setSearchTicker] = useState("");
    const [searchGrade, setSearchGrade] = useState("");
    const [searchBeta, setSearchBeta] = useState("");
    const [searchIndustry, setSearchIndustry] = useState("");

    const getFilteredData = () => {

        let data = minvestData.slice(0, 400)?.filter((entry: Entry) => {
            const companyName = entry.Company.toLowerCase();
            const ticker = entry.Ticker.toLowerCase();
            const grade = entry["Final Grade"];
            const beta = entry.Beta;
            const industry = entry.Sector;
            const tickerSearch = searchTicker.toLowerCase();
            const stockSearch = searchStock.toLowerCase();
            const isGradeMatch = searchGrade === "" || grade === searchGrade;
            let riskLevel = "";
            if (beta < 0.25) {
                riskLevel = "Very Low Risk";
            } else if (beta < 0.75) {
                riskLevel = "Low Risk";
            } else if (beta < 1.25) {
                riskLevel = "Medium Risk";
            } else if (beta < 2) {
                riskLevel = "High Risk";
            } else {
                riskLevel = "Very High Risk";
            }
            const isBetaMatch = searchBeta === "" || riskLevel === searchBeta;
            const isIndustryMatch = searchIndustry === "" || industry === searchIndustry;
            return (
                companyName.includes(stockSearch) &&
                ticker.includes(tickerSearch) &&
                isGradeMatch &&
                isIndustryMatch &&
                (searchBeta === "" || isBetaMatch)
            );
        });

        const ownedStockTickers = Object.keys(ownedStocks);
        const ownedStocksInFilteredData = data.filter((entry: Entry) => ownedStockTickers.includes(entry.Ticker));
        const unownedStocksInFilteredData = data.filter((entry: Entry) => !ownedStockTickers.includes(entry.Ticker));
        return [...ownedStocksInFilteredData, ...unownedStocksInFilteredData];
    }


    // To get the filtered data as an array
    const filteredData = getFilteredData();


    // valuate investment when user buys/sells a stock
    useEffect(() => {
        valuateInvestment();
    }, [ownedStocks]);


    // update user graph when investment value updates
    useEffect(() => {

        // don't update graph if metadata has not been fetched yet - otherwise it'll overwrite data
        if (userMetadata.placeholder) {
            return;
        }

        let data = [...userInvestmentData];
        data.push({ x: new Date(), y: investmentValue + userCash });

        console.log("old UID: ", userInvestmentData)
        console.log("new UID: ", data)
        setUserInvestmentData(data);

    }, [investmentValue])




    async function valuateInvestment() {

        let tickers = Object.keys(ownedStocks)
        let value = 0


        // skip this if it is a new user
        if (userInvestmentData.length != 0) {

            // check if previous date logged is further than 24 hours ago
            let currentTime = new Date();
            let previousTime = new Date(userInvestmentData[userInvestmentData.length - 1].x);
            const timeDifference = currentTime.getTime() - previousTime.getTime();
            const hoursDifference = timeDifference / (1000 * 60 * 60);


            // if so, fill in gaps in 1 day intervals
            if (hoursDifference > 24) {

                console.log("FILLING IN GAPS")

                let newInvestmentData = []

                // get data for first ticker 
                const historicalStockPriceData = await axios.get(
                    `https://financialmodelingprep.com/api/v3/historical-chart/1day/${tickers[0]}?from=${previousTime.toISOString().slice(0, 10)}&to=${currentTime.toISOString().slice(0, 10)}&apikey=[REDACTED]`
                );

                // iterate through the first ticker's dates and add their info to the newInvestmentData
                let data = historicalStockPriceData.data
                data.reverse()
                for (let i = 0; i < data.length; i++) {

                    if (data[i].date.split(" ")[0] == previousTime.toISOString().slice(0, 10)) {
                        continue
                    }
                    newInvestmentData.push({ "x": data[i].date, "y": data[i].close * ownedStocks[tickers[0]] + userCash })
                }


                // iterate through the rest of the tickers, add their price to the corresponding dates
                for (let i = 1; i < tickers.length; i++) {
                    let historicalStockPriceData = await axios.get(
                        `https://financialmodelingprep.com/api/v3/historical-chart/1day/${tickers[i]}?from=${previousTime.toISOString().slice(0, 10)}&to=${currentTime.toISOString().slice(0, 10)}&apikey=[REDACTED]`
                    );

                    let data = historicalStockPriceData.data
                    data.reverse()

                    for (let j = 0; j < data.length - 1; j++) {
                        if (data[j].date.split(" ")[0] == previousTime.toISOString().slice(0, 10)) {
                            continue
                        }
                        let toBeAdded = newInvestmentData[j]
                        toBeAdded.y += data[j].close * ownedStocks[tickers[i]]
                    }
                }

                console.log(newInvestmentData)

                // join old UID and new UID and set it's value
                let oldUID = [...userInvestmentData]
                console.log(oldUID)
                newInvestmentData = [...oldUID, ...newInvestmentData]
                setUserInvestmentData(newInvestmentData)
            }
        }


        value = 0

        // calculate the total investment value based on owned stocks and user cash
        for (let i = 0; i < tickers.length; i++) {
            let price = await fetchCurrentPrice(tickers[i])
            value += price * ownedStocks[tickers[i]]
        }

        setInvestmentValue(Math.round(value * 100) / 100);
        console.log("investment valuated: " + Math.round(value * 100) / 100);
    }



    return (
        <>
            {isLoadingMetadata ? (
                <Box textAlign="center" my={4}>
                    <Spinner color="blue.500" />
                    <Text>Loading profile information...</Text>
                </Box>
            ) : (
                <>
                    {!isModalOpen && (
                        <Box>
                            <Flex direction="column">
                                <Flex justifyContent="space-between" alignItems="center" px={4} py={2} mb={3} bg="gray.800">
                                    <Text fontWeight="bold" color="white">Cash: ${userCash.toFixed(2)}</Text>
                                </Flex>
                                <Box bg="gray.800" width="100%" height="500px" borderRadius={10} mr={4} p={4} position="relative">
                                    <Text fontWeight="bold" fontSize={24} mb={2}>
                                        Investing ${investmentValue.toFixed(2)}
                                    </Text>
                                    <Stack direction="row" spacing="2" mb="5">
                                        <Button size="sm" onClick={() => setGraphPeriod(1)} variant="outline" backgroundColor={(graphPeriod === 1) ? "purple.600" : "transparent"}>1D</Button>
                                        <Button size="sm" onClick={() => setGraphPeriod(5)} variant="outline" backgroundColor={(graphPeriod === 5) ? "purple.600" : "transparent"}>5D</Button>
                                        <Button size="sm" onClick={() => setGraphPeriod(30)} variant="outline" backgroundColor={(graphPeriod === 30) ? "purple.600" : "transparent"}>1M</Button>
                                        <Button size="sm" onClick={() => setGraphPeriod(180)} variant="outline" backgroundColor={(graphPeriod === 180) ? "purple.600" : "transparent"}>6M</Button>
                                        <Button size="sm" onClick={() => setGraphPeriod(365)} variant="outline" backgroundColor={(graphPeriod === 365) ? "purple.600" : "transparent"}>1Y</Button>
                                        <Button size="sm" onClick={() => setGraphPeriod(0)} variant="outline" backgroundColor={(graphPeriod === 0) ? "purple.600" : "transparent"}>MAX</Button>
                                    </Stack>

                                    {/* message for new users with empty graphs */}
                                    {(isLoadingMetadata == false && userInvestmentData.length == 0) &&
                                        <Text position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" color="white" fontSize="2xl" fontWeight="bold">
                                            Click on one of the stocks below to begin Simvesting!
                                        </Text>
                                    }

                                    {/* graph */}
                                    <Box width="100%" height="380px" position="relative">
                                        <Line data={chartData} options={options} />
                                    </Box>
                                </Box>
                            </Flex>

                            <Box bg="gray.800" width="100%" my={5} mx={0} borderRadius={10} p={4}>
                                <Box
                                    bg="gray.800"
                                    width="100%"
                                    my={5}
                                    mx={0}
                                    borderRadius={10}
                                    p={4}
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Input
                                        width="20%"
                                        type="text"
                                        placeholder="Search Stock"
                                        mr={2}
                                        value={searchStock}
                                        onChange={(e) => setSearchStock(e.target.value)}
                                    />
                                    <Input
                                        width="20%"
                                        type="text"
                                        placeholder="Search Ticker"
                                        mr={2}
                                        value={searchTicker}
                                        onChange={(e) => setSearchTicker(e.target.value)}
                                    />
                                    <Menu>
                                        <MenuButton
                                            px={4}
                                            py={2}
                                            transition="all 0.2s"
                                            borderRadius="md"
                                            borderWidth="1px"
                                            _hover={{ bg: "gray.400" }}
                                            _expanded={{ bg: "blue.400" }}
                                            _focus={{ boxShadow: "outline" }}
                                            whiteSpace="nowrap"
                                            overflow="hidden"
                                            textOverflow="ellipsis"
                                            mr={2}
                                        >
                                            {searchGrade ? `${searchGrade}` : "Final Grade"}{" "}
                                            <ChevronDownIcon />
                                        </MenuButton>
                                        <MenuList>
                                            <MenuItem onClick={() => setSearchGrade("A")}>
                                                A
                                            </MenuItem>
                                            <MenuItem onClick={() => setSearchGrade("B")}>
                                                B
                                            </MenuItem>
                                            <MenuItem onClick={() => setSearchGrade("C")}>
                                                C
                                            </MenuItem>
                                            <MenuItem onClick={() => setSearchGrade("D")}>
                                                D
                                            </MenuItem>
                                        </MenuList>
                                    </Menu>
                                    <Menu>
                                        <MenuButton
                                            px={4}
                                            py={2}
                                            mr={2}
                                            transition="all 0.2s"
                                            borderRadius="md"
                                            borderWidth="1px"
                                            _hover={{ bg: "gray.400" }}
                                            _expanded={{ bg: "blue.400" }}
                                            _focus={{ boxShadow: "outline" }}
                                            whiteSpace="nowrap"
                                            overflow="hidden"
                                            textOverflow="ellipsis"
                                            value={searchBeta}
                                        >
                                            {searchBeta ? `${searchBeta}` : "Beta"}{" "}
                                            <ChevronDownIcon />
                                        </MenuButton>
                                        <MenuList>
                                            <MenuItem
                                                onClick={() => setSearchBeta("Very Low Risk")}
                                            >
                                                Very Low Risk
                                            </MenuItem>
                                            <MenuItem onClick={() => setSearchBeta("Low Risk")}>
                                                Low Risk
                                            </MenuItem>
                                            <MenuItem onClick={() => setSearchBeta("Medium Risk")}>
                                                Medium Risk
                                            </MenuItem>
                                            <MenuItem onClick={() => setSearchBeta("High Risk")}>
                                                High Risk
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => setSearchBeta("Very High Risk")}
                                            >
                                                Very High Risk
                                            </MenuItem>
                                        </MenuList>
                                    </Menu>
                                    <Menu>
                                        <MenuButton
                                            px={4}
                                            py={2}
                                            mr={2}
                                            transition="all 0.2s"
                                            borderRadius="md"
                                            borderWidth="1px"
                                            _hover={{ bg: "gray.400" }}
                                            _expanded={{ bg: "blue.400" }}
                                            _focus={{ boxShadow: "outline" }}
                                            whiteSpace="nowrap"
                                            overflow="hidden"
                                            textOverflow="ellipsis"
                                            value={searchIndustry}
                                        >
                                            {searchIndustry ? `${searchIndustry}` : "Industry"}{" "}
                                            <ChevronDownIcon />
                                        </MenuButton>
                                        <MenuList>
                                            <MenuItem
                                                onClick={() =>
                                                    setSearchIndustry("Information Technology")
                                                }
                                            >
                                                Information Technology
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => setSearchIndustry("Health Care")}
                                            >
                                                Health Care
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => setSearchIndustry("Financials")}
                                            >
                                                Financials
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() =>
                                                    setSearchIndustry("Consumer Discretionary")
                                                }
                                            >
                                                Consumer Discretionary
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() =>
                                                    setSearchIndustry("Communication Services")
                                                }
                                            >
                                                Communication Services
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => setSearchIndustry("Industrials")}
                                            >
                                                Industrials
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() =>
                                                    setSearchIndustry("Consumer Staples")
                                                }
                                            >
                                                Consumer Staples
                                            </MenuItem>
                                            <MenuItem onClick={() => setSearchIndustry("Energy")}>
                                                Energy
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => setSearchIndustry("Utilities")}
                                            >
                                                Utilities
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => setSearchIndustry("Real Estate")}
                                            >
                                                Real Estate
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => setSearchIndustry("Materials")}
                                            >
                                                Materials
                                            </MenuItem>
                                        </MenuList>
                                    </Menu>
                                    <Button
                                        onClick={() => {
                                            setSearchStock("");
                                            setSearchTicker("");
                                            setSearchGrade("");
                                            setSearchBeta("");
                                            setSearchIndustry("");
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                </Box>
                                <Divider></Divider>
                                {isLoadingData ? (
                                    <Box textAlign="center" mt={5}>
                                        <Spinner color="purple.400" />
                                    </Box>
                                ) : (
                                    <Table variant="simple" size="lg">
                                        <Thead>
                                            <Tr>
                                                <Th>Name</Th>
                                                <Th>Ticker</Th>
                                                <Th>Final Grade</Th>
                                                <Th>Price</Th>
                                                <Th>Industry</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {filteredData.slice(0, 400)?.map((entry: Entry, index) => (
                                                <Tr
                                                    key={index}
                                                    onClick={() => handleClick(entry)}
                                                >
                                                    <Td
                                                        fontWeight="bold"
                                                        color={gradeColors[entry["Final Grade"]]}
                                                    >
                                                        <Box display="flex" flexDirection={"column"}>
                                                            <Text paddingRight={4}>
                                                                {entry.Company}
                                                            </Text>

                                                            {(Object.keys(ownedStocks).includes(entry.Ticker) && ownedStocks[entry.Ticker]) &&
                                                                <Text textColor="white" fontSize={"sm"}>
                                                                    {ownedStocks[entry.Ticker]} stock{(ownedStocks[entry.Ticker] != 1) && 's'} owned
                                                                </Text>}

                                                        </Box>
                                                    </Td>
                                                    <Td>{entry.Ticker}</Td>
                                                    <Td>{entry["Final Grade"]}</Td>
                                                    <Td>
                                                        ${(Math.round(entry.Price * 100) / 100).toFixed(2)}<br />
                                                        <Text color={(entry.Change < 0) ? "rgb(255,0,0)" : "rgb(0,255,0)"}>
                                                            {(entry.Change > 0) && "+"}
                                                            {(Math.round((entry.Change / entry.Price * 100) * 100) / 100).toFixed(2)}%
                                                        </Text>
                                                    </Td>
                                                    <Td>{entry.Sector}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                )}
                            </Box>
                        </Box>
                    )}

                    {isModalOpen && (
                        <Box>
                            <Flex direction={"row"}>
                                <Box bg="gray.800" width="70%" borderRadius={10} mr={4} p={4}>
                                    <Text fontWeight="bold" fontSize={24} mb={2}>
                                        Stock Price Chart
                                    </Text>
                                    {!chartMovingAverage && <Line
                                        data={{
                                            labels: stockDates?.slice(-250),
                                            datasets: [
                                                {
                                                    label: "",
                                                    fill: false,
                                                    backgroundColor: "rgba(255,255,255,1)",
                                                    borderColor: "rgba(159,122,234,1)",
                                                    borderCapStyle: "butt",
                                                    borderDash: [],
                                                    borderDashOffset: 0.0,
                                                    borderJoinStyle: "miter",
                                                    pointBorderColor: "rgba(229,198,70,1)",
                                                    pointBackgroundColor: "#fff",
                                                    pointBorderWidth: 1,
                                                    pointHoverRadius: 5,
                                                    pointHoverBackgroundColor: "rgba(75,192,192,1)",
                                                    pointHoverBorderColor: "rgba(225,225,225,1)",
                                                    pointHoverBorderWidth: 2,
                                                    pointRadius: 2,
                                                    pointHitRadius: 10,
                                                    data: stockPrices.slice(-250),
                                                },
                                            ],
                                        }}
                                        options={{
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                x: { ticks: { display: false } },
                                                y: { ticks: { color: "white" } },
                                            },
                                        }}
                                    />}

                                    {chartMovingAverage && <><Line
                                        data={{
                                            labels: stockDates?.slice(-250),
                                            datasets: [
                                                {
                                                    label: "Price",
                                                    fill: false,
                                                    backgroundColor: "rgba(255,255,255,1)",
                                                    borderColor: "rgba(159,122,234,1)",
                                                    borderCapStyle: "butt",
                                                    borderDash: [],
                                                    borderDashOffset: 0.0,
                                                    borderJoinStyle: "miter",
                                                    pointBorderColor: "rgba(229,198,70,1)",
                                                    pointBackgroundColor: "#fff",
                                                    pointBorderWidth: 1,
                                                    pointHoverRadius: 5,
                                                    pointHoverBackgroundColor: "rgba(75,192,192,1)",
                                                    pointHoverBorderColor: "rgba(225,225,225,1)",
                                                    pointHoverBorderWidth: 2,
                                                    pointRadius: 2,
                                                    pointHitRadius: 10,
                                                    data: stockPrices.slice(-250),
                                                },

                                                {
                                                    label: "50 Day Moving Average",
                                                    fill: false,
                                                    backgroundColor: "rgba(255,255,255,1)",
                                                    borderColor: "rgba(102, 255, 51)",
                                                    borderCapStyle: "butt",
                                                    borderDash: [],
                                                    borderDashOffset: 0.0,
                                                    borderJoinStyle: "miter",
                                                    pointBorderColor: "rgba(102, 255, 51)",
                                                    pointBackgroundColor: "#fff",
                                                    pointBorderWidth: 1,
                                                    pointHoverRadius: 5,
                                                    pointHoverBackgroundColor: "rgba(75,192,192,1)",
                                                    pointHoverBorderColor: "rgba(225,225,225,1)",
                                                    pointHoverBorderWidth: 2,
                                                    pointRadius: 2,
                                                    pointHitRadius: 10,
                                                    data: calculateMovingAverage(stockPrices, 50).slice(-250),
                                                },

                                                {
                                                    label: "200 Day Moving Average",
                                                    fill: false,
                                                    backgroundColor: "rgba(255,255,255,1)",
                                                    borderColor: "rgba(255, 153, 0)",
                                                    borderCapStyle: "butt",
                                                    borderDash: [],
                                                    borderDashOffset: 0.0,
                                                    borderJoinStyle: "miter",
                                                    pointBorderColor: "rgba(255, 153, 0)",
                                                    pointBackgroundColor: "#fff",
                                                    pointBorderWidth: 1,
                                                    pointHoverRadius: 5,
                                                    pointHoverBackgroundColor: "rgba(75,192,192,1)",
                                                    pointHoverBorderColor: "rgba(225,225,225,1)",
                                                    pointHoverBorderWidth: 2,
                                                    pointRadius: 2,
                                                    pointHitRadius: 10,
                                                    data: calculateMovingAverage(stockPrices, 200).slice(-250),
                                                },
                                            ],
                                        }}
                                        options={{
                                            plugins: {
                                                legend: {
                                                    display: true, // Make sure the legend is visible
                                                    labels: {
                                                        color: 'rgb(255,  255,  255)' // Set the color of the legend text to red
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: { ticks: { display: false } },
                                                y: { ticks: { color: "white" } },
                                            },
                                        }}
                                    />
                                        {analyzeSignal(stockPrices.slice(-250).reverse(), calculateMovingAverage(stockPrices, 50).slice(-250).reverse(), calculateMovingAverage(stockPrices, 200).slice(-250).reverse()) == "bullish signal" && <Text fontWeight='bold' textAlign='center' color='green.400'><TriangleUpIcon color='green.400' />Bullish divergence (Buy signal)</Text>}
                                        {analyzeSignal(stockPrices.slice(-250).reverse(), calculateMovingAverage(stockPrices, 50).slice(-250).reverse(), calculateMovingAverage(stockPrices, 200).slice(-250).reverse()) == "bearish signal" && <Text fontWeight='bold' textAlign='center' color='red.400'><TriangleDownIcon color='red.400' />Bearish divergence (Sell signal)</Text>}
                                        {analyzeSignal(stockPrices.slice(-250).reverse(), calculateMovingAverage(stockPrices, 50).slice(-250).reverse(), calculateMovingAverage(stockPrices, 200).slice(-250).reverse()) == "neutral" && <Text fontWeight='bold' textAlign='center'>Neutral signal</Text>}</>}
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setChartMovingAverage(false)
                                        }}
                                        sx={{ marginTop: 2 }}
                                    >
                                        <Text>Default</Text>
                                    </Button>
                                    <Button
                                        sx={{ marginLeft: 2, marginTop: 2 }}
                                        size="sm"
                                        onClick={() => {
                                            setChartMovingAverage(true)
                                        }}
                                    >
                                        <Text>Moving Average</Text>
                                    </Button>
                                </Box>
                                <Flex width="30%" justifyContent={"space-between"} direction={"column"}>
                                    <Box bg="gray.800" width="100%" height="30%" mr={2} borderRadius={10} p={4}>
                                        <Flex direction={"row"}>
                                            <Text fontWeight="bold" fontSize={24} mb={2}>
                                                Overview
                                            </Text>
                                            <IconButton
                                                icon={<CloseButton />}
                                                variant="ghost"
                                                size="sm"
                                                color="white"
                                                position={"absolute"}
                                                right={4}
                                                onClick={() => setIsModalOpen(false)}
                                            />
                                        </Flex>

                                        <Flex direction={"row"}>
                                            <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                Price:
                                            </Text>
                                            <Text fontSize={14} mb={2}>
                                                {(Math.round(selectedEntry?.Price! * 100) / 100).toFixed(2)}
                                            </Text>
                                        </Flex>
                                        <Flex direction={"row"}>
                                            <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                Risk Level:
                                            </Text>
                                            <Text fontSize={14} mb={2}>
                                                {selectedEntry?.Beta}
                                            </Text>
                                        </Flex>
                                        <Flex direction={"row"}>
                                            <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                Industry:
                                            </Text>
                                            <Text fontSize={14} mb={2}>
                                                {selectedEntry?.Sector}
                                            </Text>
                                        </Flex>
                                    </Box>
                                    <br></br>
                                    <Box bg="gray.800" width="100%" height="70%" mr={2} borderRadius={10} p={4}>
                                        <Flex flex={1} justifyContent={"space-between"} direction={"row"} style={{ borderBottom: "1px solid grey" }}>
                                            <Center>
                                                <Button borderRadius={2} style={{ borderBottom: isBuying ? "2px solid #9984E3" : "1px solid transparent" }} textColor="purple.400" bg="gray.800" onClick={() => setIsBuying(true)}>Buy {selectedEntry?.Ticker}</Button>
                                                <Button borderRadius={2} style={{ borderBottom: !isBuying ? "2px solid #9984E3" : "1px solid transparent" }} textColor="purple.400" bg="gray.800" onClick={() => setIsBuying(false)}>Sell {selectedEntry?.Ticker}</Button>
                                            </Center>
                                        </Flex>
                                        <br></br>
                                        {isBuying && (
                                            <Flex flex={1} justifyContent={"space-between"} direction={"row"}>
                                                <Flex flex={1} justifyContent={"space-between"} direction={"column"}>
                                                    <Flex direction={"row"}>
                                                        <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                            Your money:
                                                        </Text>
                                                        <Text fontSize={14} mr={2} mb={2}>
                                                            ${userCash.toFixed(2)}
                                                        </Text>
                                                    </Flex>
                                                    <Flex direction={"row"}>
                                                        <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                            Shares owned:
                                                        </Text>
                                                        <Text fontSize={14} mr={2} mb={2}>
                                                            {ownedStocks[selectedEntry!.Ticker] ? ownedStocks[selectedEntry!.Ticker] : 0}
                                                        </Text>
                                                    </Flex>
                                                    <Box>
                                                        <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                            Dollar Amount($):
                                                        </Text>
                                                        <Input onChange={handleDollarAmountChange} value={valOfShares} placeholder="Cost">

                                                        </Input>
                                                    </Box>
                                                    <Box>
                                                        <Text fontWeight="bold" fontSize={14} mt={3} mr={2} mb={2}>
                                                            Number of Shares:
                                                        </Text>
                                                        <Input onChange={handleStockChange} value={numOfShares} placeholder="Shares">

                                                        </Input>
                                                    </Box>
                                                    <br>
                                                    </br>
                                                    <Box>
                                                        <Button fontSize={14} mr={2} mb={2} bg="purple.400" onClick={handleOrder}>
                                                            Review Order
                                                        </Button>
                                                    </Box>
                                                </Flex>
                                            </Flex>
                                        )}
                                        {!isBuying && (
                                            <Flex flex={1} justifyContent={"space-between"} direction={"row"}>
                                                <Flex flex={1} justifyContent={"space-between"} direction={"column"}>
                                                    <Flex direction={"row"}>
                                                        <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                            Your money:
                                                        </Text>
                                                        <Text fontSize={14} mr={2} mb={2}>
                                                            ${userCash.toFixed(2)}
                                                        </Text>
                                                    </Flex>
                                                    <Flex direction={"row"}>
                                                        <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                            Shares owned:
                                                        </Text>
                                                        <Text fontSize={14} mr={2} mb={2}>
                                                            {ownedStocks[selectedEntry!.Ticker] ? ownedStocks[selectedEntry!.Ticker] : 0}
                                                        </Text>
                                                    </Flex>
                                                    <Box>
                                                        <Text fontWeight="bold" fontSize={14} mr={2} mb={2}>
                                                            Dollar Amount($):
                                                        </Text>
                                                        <Input onChange={handleDollarAmountChange} value={valOfShares} placeholder="Cost">

                                                        </Input>
                                                    </Box>
                                                    <Box>
                                                        <Text fontWeight="bold" fontSize={14} mt={3} mr={2} mb={2}>
                                                            Number of Shares:
                                                        </Text>
                                                        <Input onChange={handleStockChange} value={numOfShares} placeholder="Shares">

                                                        </Input>
                                                    </Box>
                                                    <br>
                                                    </br>
                                                    <Box>
                                                        <Button fontSize={14} mr={2} mb={2} bg="purple.400" onClick={handleOrder}>
                                                            Review Order
                                                        </Button>
                                                    </Box>
                                                </Flex>
                                            </Flex>
                                        )}
                                    </Box>
                                </Flex>
                            </Flex>
                            <Flex direction={"row"}>
                                <Box
                                    bg="gray.800"
                                    width="50%"
                                    borderRadius={10}
                                    mt={4}
                                    mr={4}
                                    p={4}
                                >
                                    <Flex direction={"row"}>
                                        <Text fontWeight="bold" fontSize={30}>
                                            {selectedEntry?.Company}
                                        </Text>
                                        <Text color="purple.400" ml={2} mt={3} fontWeight="bold">
                                            Final Grade:
                                        </Text>
                                        {selectedEntry?.["Final Grade"] && (
                                            <Text
                                                mt={3}
                                                color={gradeColors[
                                                    selectedEntry?.["Final Grade"]
                                                ]}
                                                marginLeft={1}
                                                marginRight={1}
                                                fontWeight="bold"
                                            >
                                                {selectedEntry?.["Final Grade"]}
                                            </Text>
                                        )}
                                    </Flex>
                                    <Text fontSize={18} mb={2}>
                                        {selectedEntry?.Ticker}
                                    </Text>
                                    <Text fontSize={14}>{selectedEntry?.Description}</Text>
                                </Box>
                                <Box bg="gray.800" width="50%" borderRadius={10} mt={4} p={4}>
                                    <Accordion allowToggle>
                                        <AccordionItem>
                                            <h2>
                                                <AccordionButton>
                                                    <Box as="span" flex="1" textAlign="left">
                                                        <Flex direction={"row"}>
                                                            <Text
                                                                as="span"
                                                                fontWeight={"bold"}
                                                                fontSize={24}
                                                            >
                                                                Valuation Grade
                                                            </Text>
                                                            {selectedEntry?.["Valuation Grade"] && (
                                                                <Text
                                                                    as="span"
                                                                    fontSize={24}
                                                                    color={gradeColors[
                                                                        selectedEntry?.[
                                                                        "Valuation Grade"
                                                                        ]
                                                                    ]}
                                                                    marginLeft={4}
                                                                    marginRight={1}
                                                                    fontWeight="bold"
                                                                >
                                                                    {
                                                                        selectedEntry?.[
                                                                        "Valuation Grade"
                                                                        ]
                                                                    }
                                                                </Text>
                                                            )}
                                                            <CustomTooltip label="A measure of how overpriced or underpriced a stock is. With these metrics, a lower number compared to industry peers is better."></CustomTooltip>
                                                        </Flex>
                                                    </Box>
                                                    <AccordionIcon />
                                                </AccordionButton>
                                            </h2>
                                            <AccordionPanel pb={4}>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much people are willing to pay for a company's shares compared to the money the company makes."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        P/E Ratio (Price-to-Earnings Ratio)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.PE?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["PE Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["PE Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["PE Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>

                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much people are willing to pay for a company's shares compared to the money the company makes from selling stuff."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        P/S Ratio (Price-to-Sales Ratio)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.PS?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["PS Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["PS Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["PS Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>

                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much people are willing to pay for a company's shares compared to the value of all its stuff (like buildings and equipment)."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        P/B Ratio (Price-to-Book Ratio)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.PB?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["PB Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["PB Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["PB Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>

                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="Considers how fast a company is growing when looking at its share price compared to its earnings."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        PEG Ratio (Price/Earnings to Growth Ratio)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.PEG?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["PEG Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["PEG Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["PEG Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much people think a company is worth compared to the money it makes from selling things."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        EV/R Ratio (Enterprise Value-to-Revenue
                                                        Ratio)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.["EV/S"]?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["EV/S Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["EV/S Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["EV/S Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>

                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much people think a company is worth compared to the money it makes, not counting some tricky things."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        EV/EBITDA Ratio (Enterprise Value-to-EBITDA
                                                        Ratio)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.["EV/EBITDA"]?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["EV/EBITDA Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["EV/EBITDA Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["EV/EBITDA Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                            </AccordionPanel>
                                        </AccordionItem>

                                        <AccordionItem>
                                            <h2>
                                                <AccordionButton>
                                                    <Box as="span" flex="1" textAlign="left">
                                                        <Flex direction={"row"}>
                                                            <Text fontWeight={"bold"} fontSize={24}>
                                                                Financial Grade
                                                            </Text>
                                                            {selectedEntry?.["Financial Grade"] && (
                                                                <Text
                                                                    as="span"
                                                                    fontSize={24}
                                                                    color={gradeColors[
                                                                        selectedEntry?.[
                                                                        "Financial Grade"
                                                                        ]
                                                                    ]}
                                                                    marginLeft={4}
                                                                    marginRight={1}
                                                                    fontWeight="bold"
                                                                >
                                                                    {
                                                                        selectedEntry?.[
                                                                        "Financial Grade"
                                                                        ]
                                                                    }
                                                                </Text>
                                                            )}
                                                            <CustomTooltip label="These show if the company is in a good financial position to keep growing and generating shareholder value."></CustomTooltip>
                                                        </Flex>
                                                    </Box>
                                                    <AccordionIcon />
                                                </AccordionButton>
                                            </h2>
                                            <AccordionPanel pb={4}>
                                                <Flex direction={"row"}>
                                                    <Text
                                                        as={"span"}
                                                        fontWeight={"bold"}
                                                        fontSize={18}
                                                        mt={0.5}
                                                        color={"purple.400"}
                                                    >
                                                        Management Effectiveness
                                                    </Text>
                                                    <CustomTooltip label="This shows how good of a job the company is doing with generating returns from assets and money that shareholders invest in it. Higher values are always better."></CustomTooltip>
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How good a company is at making money with all the things it owns."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Return on Assets (ROA)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.ROA?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["ROA Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["ROA Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["ROA Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How good a company is at making money compared to the money its owners put in."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Return on Equity (ROE)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.ROE?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["ROE Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["ROE Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["ROE Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>

                                                <Flex direction={"row"} mt={2}>
                                                    <Text
                                                        as={"span"}
                                                        fontWeight={"bold"}
                                                        fontSize={18}
                                                        mt={0.5}
                                                        color={"purple.400"}
                                                    >
                                                        Profitability
                                                    </Text>
                                                    <CustomTooltip label="This shows how good the company is at making money and minimizing costs from its operations. Higher values are always better."></CustomTooltip>
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much money a company has left after subtracting what it cost to make and sell its products."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Gross Margin
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.GM?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["GM Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["GM Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["GM Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much money a company makes before subtracting some tricky things, compared to its revenue."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        EBITDA Margin (Earnings Before Interest,
                                                        Taxes, Depreciation, and Amortization
                                                        Margin)
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.EM?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["EM Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["EM Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["EM Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much money a company makes after subtracting all the costs of running the business, compared to its revenue."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Operating Margin
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.OM?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["OM Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["OM Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["OM Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much money a company makes after subtracting all the costs, including the tricky things, compared to its revenue."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Profit Margin
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.PM?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["PM Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["PM Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["PM Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>

                                                <Flex direction={"row"} mt={2}>
                                                    <Text
                                                        as={"span"}
                                                        fontWeight={"bold"}
                                                        fontSize={18}
                                                        mt={0.5}
                                                        color={"purple.400"}
                                                    >
                                                        Liquidity/Leverage
                                                    </Text>
                                                    <CustomTooltip label="This shows if the company is taking on too much debt and might be unable to meet short term obligations. Lower values are usually better."></CustomTooltip>
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="Whether a company has enough stuff (assets) to cover what it owes (liabilities) right now."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Current Ratio
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.CR?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["CR Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["CR Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["CR Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much a company owes compared to how much its owners put in."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Debt to Equity Ratio
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.DE?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["DE Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["DE Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["DE Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>

                                                <Flex direction={"row"} mt={2}>
                                                    <Text
                                                        as={"span"}
                                                        fontWeight={"bold"}
                                                        fontSize={18}
                                                        mt={0.5}
                                                        color={"purple.400"}
                                                    >
                                                        Growth
                                                    </Text>
                                                    <CustomTooltip label="This is self-explanatory; is the company growing its revenue and profit? Higher numbers are always better."></CustomTooltip>
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much more money a company is making compared to before."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Earnings Growth
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.EG?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["EG Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["EG Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["EG Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex
                                                    direction={"row"}
                                                    justifyContent={"space-between"}
                                                    alignItems="center"
                                                    width="100%"
                                                >
                                                    <CustomTooltip label="How much more money a company is making from selling things compared to before."></CustomTooltip>
                                                    <Text
                                                        as="span"
                                                        fontWeight={"bold"}
                                                        fontSize={14}
                                                        flex="1"
                                                    >
                                                        Revenue Growth
                                                    </Text>

                                                    <Text
                                                        as="span"
                                                        fontWeight="bold"
                                                        mr={6}
                                                        fontSize={14}
                                                    >
                                                        {selectedEntry?.RG?.toFixed(2)}
                                                    </Text>

                                                    {selectedEntry?.["RG Grade"] && (
                                                        <Text
                                                            as="span"
                                                            fontSize={14}
                                                            color={gradeColors[
                                                                selectedEntry?.["RG Grade"]
                                                            ]}
                                                            marginLeft={4}
                                                            fontWeight="bold"
                                                        >
                                                            {selectedEntry?.["RG Grade"]}
                                                        </Text>
                                                    )}
                                                </Flex>
                                            </AccordionPanel>
                                        </AccordionItem>
                                    </Accordion>
                                </Box>
                            </Flex>
                        </Box>
                    )}
                </>
            )}
        </>
    );

}

export default Simvest;
